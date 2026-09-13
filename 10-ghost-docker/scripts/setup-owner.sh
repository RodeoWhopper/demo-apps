#!/usr/bin/env bash
# Idempotent first-run setup for the Sığınak Ghost site via the Admin API:
#   1. creates the owner account (skipped when Ghost is already set up)
#   2. opens an admin session, activates the "siginak" theme
#   3. sets site metadata + navigation, seeds a page and a few posts (only when missing)
# Requires: curl, python3 (JSON parsing). Run from anywhere: scripts/setup-owner.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found – copying .env.example (demo values)."
  cp .env.example .env
fi
env_value() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]\$//"; }
BASE="$(env_value GHOST_URL)";             BASE="${BASE:-http://localhost:8010}"; BASE="${BASE%/}"
OWNER_NAME="$(env_value GHOST_OWNER_NAME)"; OWNER_NAME="${OWNER_NAME:-Sığınak Editörü}"
OWNER_EMAIL="$(env_value GHOST_OWNER_EMAIL)"; OWNER_EMAIL="${OWNER_EMAIL:-owner@siginak.dev}"
OWNER_PASS="$(env_value GHOST_OWNER_PASSWORD)"; OWNER_PASS="${OWNER_PASS:-Owner123!!}"
SITE_TITLE="Sığınak"
API="$BASE/ghost/api/admin"
JAR="$(mktemp)"; RESP="$(mktemp)"; trap 'rm -f "$JAR" "$RESP"' EXIT

# JSON helpers (python3 keeps us free of jq)
json() { python3 -c 'import json,sys; print(json.dumps(dict(zip(sys.argv[1::2], sys.argv[2::2])), ensure_ascii=False))' "$@"; }
jget() { python3 -c 'import json,sys; d=json.load(sys.stdin)
for k in sys.argv[1].split("."):
    d = d[int(k)] if k.isdigit() else d[k]
print(d if not isinstance(d,bool) else str(d).lower())' "$1"; }
# api <method> <path> [json-body]  -> prints body, sets $CODE
api() {
  local m="$1" p="$2" body="${3:-}" out
  if [ -n "$body" ]; then
    out="$(curl -sS -b "$JAR" -c "$JAR" -X "$m" "$API$p" -H "Origin: $BASE" -H "Content-Type: application/json" -H "Accept-Version: v5.0" -d "$body" -w '\n%{http_code}')"
  else
    out="$(curl -sS -b "$JAR" -c "$JAR" -X "$m" "$API$p" -H "Origin: $BASE" -H "Accept-Version: v5.0" -w '\n%{http_code}')"
  fi
  CODE="${out##*$'\n'}"; printf '%s' "${out%$'\n'*}" | tee "$RESP"
}

echo "==> Waiting for Ghost at $BASE ..."
for _ in $(seq 1 90); do
  curl -fsS -o /dev/null "$API/site/" 2>/dev/null && break
  sleep 2
done
curl -fsS -o /dev/null "$API/site/"

echo "==> Owner account"
STATUS="$(api GET /authentication/setup/ | jget setup.0.status)"
if [ "$STATUS" = "true" ]; then
  echo "    already set up – skipping"
else
  api POST /authentication/setup/ "{\"setup\":[$(json name "$OWNER_NAME" email "$OWNER_EMAIL" password "$OWNER_PASS" blogTitle "$SITE_TITLE")]}" >/dev/null
  [ "$CODE" = "201" ] || { echo "setup failed ($CODE)"; exit 1; }
  echo "    created $OWNER_EMAIL"
fi

echo "==> Admin session"
api POST /session/ "$(json username "$OWNER_EMAIL" password "$OWNER_PASS")" >/dev/null
[ "$CODE" = "201" ] || { echo "login failed ($CODE)"; exit 1; }

echo "==> Theme"
ACTIVE="$(api GET '/themes/' | python3 -c 'import json,sys; print(next(t["name"] for t in json.load(sys.stdin)["themes"] if t.get("active")))')"
if [ "$ACTIVE" = "siginak" ]; then
  echo "    siginak already active"
else
  api PUT /themes/siginak/activate/ >/dev/null
  case "$CODE" in 200|201) ;; *) echo "theme activation failed ($CODE): $(cat "$RESP")"; exit 1 ;; esac
  # gscan warnings (non-fatal) are reported in the response; surface them for theme authors
  python3 -c 'import json,sys
for t in json.load(sys.stdin).get("themes",[]):
    for e in t.get("errors",[]):
        print("    theme warning:", e.get("code"), "-", ", ".join(f["ref"] for f in e.get("failures",[])))' < "$RESP" || true
  echo "    activated siginak"
fi

echo "==> Site settings + navigation"
api PUT /settings/ "$(python3 - "$SITE_TITLE" <<'PY'
import json,sys
nav=[{"label":"Anasayfa","url":"/"},{"label":"Bülten","url":"/newsletter/"},{"label":"Arşiv","url":"/archive/"},{"label":"Hakkında","url":"/hakkinda/"}]
sec=[{"label":"RSS","url":"/rss/"}]
print(json.dumps({"settings":[
  {"key":"title","value":sys.argv[1]},
  {"key":"description","value":"Şehir, yürüyüş ve yavaş yaşam üzerine haftalık mektuplar."},
  {"key":"locale","value":"tr"},
  {"key":"timezone","value":"Europe/Istanbul"},
  {"key":"accent_color","value":"#e8b04b"},
  {"key":"navigation","value":json.dumps(nav,ensure_ascii=False)},
  {"key":"secondary_navigation","value":json.dumps(sec,ensure_ascii=False)},
  {"key":"members_signup_access","value":"all"}
]},ensure_ascii=False))
PY
)" >/dev/null
[ "$CODE" = "200" ] || echo "    warning: settings update returned $CODE"

# Remove Ghost's stock English sample post ("Coming soon"); it is attributed to the owner, so match by slug.
echo "==> Removing stock sample post"
api GET /posts/slug/coming-soon/ >/dev/null
if [ "$CODE" = "200" ]; then
  STOCK_ID="$(jget posts.0.id < "$RESP")"
  api DELETE "/posts/$STOCK_ID/" >/dev/null
  echo "    deleted coming-soon"
fi

# ensure_post <posts|pages> <slug> <title> <excerpt> <published_at ISO> <tags-json> <html>
ensure_post() {
  local kind="$1" slug="$2" title="$3" excerpt="$4" date="$5" tags="$6" html="$7"
  api GET "/$kind/slug/$slug/" >/dev/null
  if [ "$CODE" = "200" ]; then return; fi
  local body
  body="$(python3 - "$kind" "$slug" "$title" "$excerpt" "$date" "$tags" "$html" <<'PY'
import json,sys
kind,slug,title,excerpt,date,tags,html=sys.argv[1:]
doc={"title":title,"slug":slug,"html":html,"status":"published","published_at":date,"custom_excerpt":excerpt}
if kind=="posts": doc["tags"]=json.loads(tags)
print(json.dumps({kind:[doc]},ensure_ascii=False))
PY
)"
  api POST "/$kind/?source=html" "$body" >/dev/null
  [ "$CODE" = "201" ] && echo "    created $kind/$slug" || echo "    warning: $kind/$slug returned $CODE"
}

NL='[{"name":"Bülten","slug":"newsletter"}]'
ESSAY='[{"name":"Deneme","slug":"deneme"}]'
CITY='[{"name":"Şehir","slug":"sehir"}]'

echo "==> Content"
ensure_post pages hakkinda "Hakkında" "Sığınak nedir, kim yazıyor?" "2026-01-05T09:00:00.000Z" '[]' \
  "<p>Sığınak, kalabalık şehirlerde yavaşlamanın yollarını arayan küçük bir bültendir. Her cumartesi sabahı bir mektup gönderiyoruz: bir yürüyüş rotası, bir kitap, bir düşünce.</p><p>Yazıların tamamı ücretsizdir. Abone olarak yeni sayıları e-postanızda alabilirsiniz; arşivdeki her şey her zaman açık kalır.</p><h2>Kim yazıyor?</h2><p>Bülteni İstanbul'da yaşayan bir editör ve zaman zaman konuk yazarlar hazırlıyor. Bu site Ghost üzerinde, <em>siginak</em> temasıyla çalışıyor.</p>"

ensure_post posts sayi-1-yavaslamanin-haritasi "Sayı 1 — Yavaşlamanın Haritası" "İlk mektup: bir şehri yürüyerek tanımanın basit kuralları." "2026-03-07T07:00:00.000Z" "$NL" \
  "<p>Merhaba. Bu, Sığınak'ın ilk sayısı. Amacımız basit: haftada bir kez durup şehre başka bir hızla bakmak.</p><h2>Bu haftanın rotası</h2><p>Kadıköy iskelesinden Moda burnuna, oradan Yoğurtçu Parkı'na. Yaklaşık 4 kilometre, acele etmezseniz iki saat.</p><blockquote>Bir sokağı tanımak için onu en az üç kez, üç farklı saatte yürümek gerekir.</blockquote><h2>Okuma</h2><p>Rebecca Solnit, <em>Yol Aşkı</em>. Yürümenin tarihine dair en iyi giriş.</p><p>Haftaya görüşmek üzere.</p>"

ensure_post posts sayi-2-sabah-isigi "Sayı 2 — Sabah Işığı" "Günün ilk saatinde şehir başka bir şehirdir." "2026-03-14T07:00:00.000Z" "$NL" \
  "<p>Bu hafta sabah 6'da kalkıp Balat'a indim. Kepenkler kapalı, fırının önünde iki kedi, bir simitçi. Şehir henüz rolünü ezberlememiş gibiydi.</p><h2>Deneme</h2><p>Bir hafta boyunca telefonunuzu evde bırakıp on beş dakikalık bir sabah yürüyüşü yapın. Gördüklerinizi akşam üç cümleyle yazın.</p><h2>Rota</h2><p>Fener iskelesi → Balat sokakları → Ayvansaray. Tepeye çıkmayın; kıyıya paralel kalın.</p>"

ensure_post posts sessizligin-mimarisi "Sessizliğin Mimarisi" "Şehirde sessiz mekânlar tesadüf değil, tasarım sonucudur." "2026-04-02T09:00:00.000Z" "$CITY" \
  "<p>Bir kütüphanenin okuma salonuna girdiğinizde omuzlarınız düşer. Bu tesadüf değildir; tavan yüksekliği, halı, ışığın açısı ve girişteki eşik birlikte çalışır.</p><h2>Üç örnek</h2><ul><li>Atatürk Kitaplığı'nın ahşap merdiveni</li><li>Süleymaniye avlusunda çınarın altı</li><li>Küçük bir mahalle camisinin son cemaat yeri</li></ul><p>Sessizlik, kalabalığın yokluğu değil; sesin nasıl karşılandığıdır.</p>"

ensure_post posts bir-bankin-hikayesi "Bir Bankın Hikâyesi" "Parktaki tek bir bankı bir hafta boyunca izlemek." "2026-04-20T09:00:00.000Z" "$ESSAY" \
  "<p>Yoğurtçu Parkı'ndaki üçüncü bank. Sabah bir emekli, öğlen bir kurye, akşam iki lise öğrencisi. Bir bank, günde en az on farklı hayatı ağırlıyor.</p><p>Şehrin en demokratik mobilyası bank olabilir: rezervasyon yok, ücret yok, kurallar yalnızca görgü.</p><h2>Not</h2><p>Belediyeler bankları kaldırdıkça insanlar kaldırım taşına oturuyor. Oturacak yer, bir şehrin misafirperverliğinin ölçüsüdür.</p>"

ensure_post posts sayi-3-gece-yuruyusu "Sayı 3 — Gece Yürüyüşü" "Şehir geceleri daha dürüsttür." "2026-04-25T07:00:00.000Z" "$NL" \
  "<p>Üçüncü sayıda geceye çıkıyoruz. Gece yürüyüşü için tek kural: bilinen sokakları, bilinmeyen saatlerde yürümek.</p><h2>Rota</h2><p>Taksim'den Cihangir'e, Fındıklı'ya inip sahilden Karaköy'e. Işıklar, kapanan dükkânlar, açık kalan tek büfe.</p><blockquote>Gece, şehrin makyajını siler.</blockquote><p>Bu hafta abone olan herkese teşekkürler. Gelecek sayıda bir konuk yazar var.</p>"

echo
echo "Done."
echo "  Site:   $BASE/          Newsletter: $BASE/newsletter/   Archive: $BASE/archive/"
echo "  Admin:  $BASE/ghost/    ($OWNER_EMAIL / $OWNER_PASS)"
echo "  Health: $API/site/"
