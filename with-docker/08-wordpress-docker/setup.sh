#!/usr/bin/env bash
# Idempotent provisioning for the Çınar Mimarlık WordPress site.
# Safe to run repeatedly: installs core once, then only creates missing content.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found – copying .env.example (demo values)."
  cp .env.example .env
fi

# Read a single value from .env without sourcing it (values contain PHP code).
env_value() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]\$//"; }
SITE_URL="$(env_value WP_HOME)";            SITE_URL="${SITE_URL:-http://localhost:8008}"
ADMIN_USER="$(env_value WP_ADMIN_USER)";    ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="$(env_value WP_ADMIN_PASSWORD)"; ADMIN_PASS="${ADMIN_PASS:-Admin123!}"
ADMIN_EMAIL="$(env_value WP_ADMIN_EMAIL)";  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@cinar.local}"
SITE_TITLE="Çınar Mimarlık"

wp() { docker compose run --rm -T --quiet-pull wpcli "$@"; }

docker compose up -d db wordpress

echo "==> Waiting for the database..."
for _ in $(seq 1 60); do
  docker compose exec -T db healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1 && break
  sleep 2
done

echo "==> Waiting for WordPress core files + wp-config.php..."
for _ in $(seq 1 60); do
  wp db query 'SELECT 1' >/dev/null 2>&1 && break
  sleep 2
done
wp db query 'SELECT 1' >/dev/null

if wp core is-installed >/dev/null 2>&1; then
  echo "==> WordPress already installed – skipping core install."
else
  echo "==> Installing WordPress core at $SITE_URL"
  wp core install --url="$SITE_URL" --title="$SITE_TITLE" \
    --admin_user="$ADMIN_USER" --admin_password="$ADMIN_PASS" --admin_email="$ADMIN_EMAIL" --skip-email
fi

echo "==> Site options"
wp option update blogname "$SITE_TITLE" >/dev/null
wp option update blogdescription "İzmir merkezli mimarlık ve iç mekân tasarım stüdyosu" >/dev/null
wp option update timezone_string "Europe/Istanbul" >/dev/null
wp option update date_format "j F Y" >/dev/null
wp option update blog_public 1 >/dev/null
wp rewrite structure '/%postname%/' >/dev/null

echo "==> Activating theme"
if [ "$(wp option get stylesheet)" != "cinar" ]; then
  wp theme activate cinar
fi

# ensure_page <slug> <title> <content>  -> prints the page ID
ensure_page() {
  local id
  id="$(wp post list --post_type=page --post_status=any --name="$1" --field=ID --format=ids)"
  if [ -z "$id" ]; then
    id="$(wp post create --post_type=page --post_status=publish --post_name="$1" --post_title="$2" --post_content="$3" --porcelain)"
    echo "    created page '$2' (#$id)" >&2
  fi
  echo "$id"
}

echo "==> Pages"
HOME_ID="$(ensure_page anasayfa "Anasayfa" "<p>Çınar Mimarlık; konut, kültür ve ticari yapılar için iklime duyarlı, ölçeğine saygılı ve zamanla güzelleşen mimari çözümler üretir. Aşağıda stüdyonun seçilmiş işlerini bulabilirsiniz.</p>")"
ABOUT_ID="$(ensure_page hakkimizda "Hakkımızda" "<p>Çınar Mimarlık 2011 yılında İzmir Alsancak'ta kuruldu. On iki kişilik ekibimiz mimar, iç mimar ve peyzaj tasarımcılarından oluşuyor.</p><h2>Yaklaşımımız</h2><p>Her projeye yerinde gözlemle başlarız: sokağın ritmi, hâkim rüzgâr, komşu yapıların yüksekliği ve malzemesi tasarım kararlarımızı belirler. Yerel taş, ahşap ve pişmiş toprak gibi malzemeleri çağdaş detaylarla yeniden yorumlarız.</p><h2>Hizmetler</h2><ul><li>Mimari tasarım ve uygulama projeleri</li><li>İç mekân tasarımı</li><li>Kentsel tasarım ve peyzaj</li><li>Restorasyon ve yeniden işlevlendirme</li></ul>")"
CONTACT_ID="$(ensure_page iletisim "İletişim" "<p>Projeniz hakkında konuşmak için bize yazın; ilk görüşme ücretsizdir.</p><h2>Stüdyo</h2><p>Kordonboyu Cad. No: 14<br>Alsancak / İzmir</p><p>E-posta: <a href=\"mailto:merhaba@cinar.local\">merhaba@cinar.local</a><br>Telefon: +90 232 000 00 00</p><h2>Çalışma Saatleri</h2><p>Hafta içi 09:00 – 18:00</p>")"

# Remove the stock "Sample Page" if it is still around.
SAMPLE_ID="$(wp post list --post_type=page --post_status=any --name=sample-page --field=ID --format=ids)"
[ -n "$SAMPLE_ID" ] && wp post delete "$SAMPLE_ID" --force >/dev/null

echo "==> Static front page"
wp option update show_on_front page >/dev/null
wp option update page_on_front "$HOME_ID" >/dev/null

# ensure_term <slug> <name>
ensure_term() {
  wp term get project_type "$1" --by=slug --field=term_id >/dev/null 2>&1 || wp term create project_type "$2" --slug="$1" >/dev/null
}

# ensure_project <slug> <title> <type-slug> <location> <year> <client> <area> <excerpt> <content>
ensure_project() {
  local id
  id="$(wp post list --post_type=project --post_status=any --name="$1" --field=ID --format=ids)"
  if [ -n "$id" ]; then
    return
  fi
  id="$(wp post create --post_type=project --post_status=publish --post_name="$1" --post_title="$2" \
        --post_excerpt="$8" --post_content="$9" \
        --meta_input="{\"cinar_location\":\"$4\",\"cinar_year\":\"$5\",\"cinar_client\":\"$6\",\"cinar_area\":\"$7\"}" --porcelain)"
  wp post term set "$id" project_type "$3" >/dev/null
  echo "    created project '$2' (#$id)"
}

echo "==> Project types + sample projects"
ensure_term konut   "Konut"
ensure_term kultur  "Kültür"
ensure_term ticari  "Ticari"
ensure_term kentsel "Kentsel Tasarım"

ensure_project kordon-konutlari "Kordon Konutları" konut "Alsancak, İzmir" "2024" "Özel" "3.400 m²" \
  "Körfeze bakan, doğal havalandırmalı 18 daireli konut bloğu." \
  "<p>Kordon Konutları, İzmir'in tarihi sahil şeridinde yer alan 18 daireli bir konut bloğudur. Derin balkonlar ve hareketli ahşap panjurlar, batı cephesini yaz güneşinden korurken körfez manzarasını kesintisiz bırakır.</p><h2>Tasarım Kararları</h2><p>Zemin katta yükseltilmiş bir avlu, sokakla konut arasında yarı kamusal bir eşik oluşturur. Taşıyıcı sistem betonarme; cephede yerel andezit taşı ve termal işlemli çam kullanılmıştır.</p><blockquote>Amaç, her dairenin en az iki yöne açılması ve mekanik soğutmaya ihtiyaç duymamasıydı.</blockquote>" 

ensure_project selcuk-kutuphanesi "Selçuk Halk Kütüphanesi" kultur "Selçuk, İzmir" "2023" "Selçuk Belediyesi" "1.900 m²" \
  "Antik kent yolunda, avlulu ve tamamen gün ışığıyla aydınlanan bir halk kütüphanesi." \
  "<p>Efes'e giden yol üzerinde konumlanan kütüphane, üç avlu etrafında düzenlenmiş tek katlı bir yapıdır. Okuma salonları kuzeye açılır; çatıdaki testere dişi ışıklıklar gün boyu homojen bir aydınlık sağlar.</p><h2>Program</h2><ul><li>Yetişkin ve çocuk okuma salonları</li><li>120 kişilik etkinlik salonu</li><li>Yerel tarih arşivi</li><li>Kafe ve açık hava okuma bahçesi</li></ul><p>Yapı, sıkıştırılmış toprak duvarlar ve ahşap makas çatı ile inşa edilmiştir.</p>"

ensure_project bostanli-pazar-yeri "Bostanlı Pazar Yeri ve Çarşı" ticari "Karşıyaka, İzmir" "2022" "Karşıyaka Belediyesi" "5.600 m²" \
  "Haftanın iki günü pazar, diğer günler açık çarşı ve etkinlik alanı olarak çalışan hafif çelik örtü." \
  "<p>Bostanlı'daki mevcut pazar yeri, mahalle ölçeğinde bir kamusal örtüye dönüştürüldü. 60 metre açıklıklı çelik strüktür, altındaki alanı kolonsuz bırakarak pazar günü dışında konser ve spor etkinliklerine izin verir.</p><h2>Sürdürülebilirlik</h2><p>Çatıdaki 1.200 m² fotovoltaik panel örtünün yıllık enerji ihtiyacını karşılar; yağmur suyu toplanarak zemin yıkamada kullanılır.</p>"

ensure_project urla-bag-evi "Urla Bağ Evi" konut "Urla, İzmir" "2021" "Özel" "280 m²" \
  "Bağın ortasında, taş duvarlar ve ahşap saçaklarla tanımlanan tek katlı hafta sonu evi." \
  "<p>Urla'daki bir bağ arazisi için tasarlanan ev, iki kalın taş duvar arasında uzanan tek bir hacimden oluşur. Güneye bakan derin saçak, kış güneşini içeri alırken yaz güneşini keser.</p><p>Bütün iç mekân doğramaları ve mobilyalar yerel ustalarla birlikte meşe ağacından üretildi. Yapı şebekeden bağımsız çalışır: güneş enerjisi, sarnıç ve biyolojik arıtma.</p>"

echo "==> Primary menu"
if ! wp menu list --fields=slug --format=csv | grep -qx primary; then
  wp menu create "Primary" >/dev/null
  wp menu item add-post primary "$HOME_ID" --title="Anasayfa" >/dev/null
  wp menu item add-custom primary "Projeler" "/projeler/" >/dev/null
  wp menu item add-post primary "$ABOUT_ID" >/dev/null
  wp menu item add-post primary "$CONTACT_ID" >/dev/null
  echo "    created menu 'Primary'"
fi
wp menu location assign primary primary >/dev/null 2>&1 || true

wp rewrite flush >/dev/null

echo
echo "Done."
echo "  Site:   $SITE_URL/"
echo "  Admin:  $SITE_URL/wp-admin/   ($ADMIN_USER / $ADMIN_PASS)"
echo "  Health: $SITE_URL/wp-json/cinar/v1/health"
