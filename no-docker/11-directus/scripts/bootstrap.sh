#!/usr/bin/env bash
# Idempotent bootstrap for Kılavuz Etkinlik (Directus 11) through the REST API:
#   - creates the `categories` and `events` collections + the m2o relation (skipped when they exist,
#     e.g. after `directus schema apply`)
#   - grants the built-in Public policy read access (events: only status = published)
#   - seeds 3 categories and 8 events when the collections are empty
#   - with --snapshot, exports the schema to ./snapshot/schema.yaml via `directus schema snapshot`
# Needs: python3 (stdlib only). Env: DIRECTUS_URL (default http://localhost:8011), ADMIN_EMAIL, ADMIN_PASSWORD
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  env_value() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]\$//"; }
  : "${DIRECTUS_URL:=$(env_value PUBLIC_URL)}"
  : "${ADMIN_EMAIL:=$(env_value ADMIN_EMAIL)}"
  : "${ADMIN_PASSWORD:=$(env_value ADMIN_PASSWORD)}"
fi
export DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8011}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kilavuz.dev}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

python3 - <<'PY'
import json, os, sys, time, urllib.request, urllib.error

BASE = os.environ["DIRECTUS_URL"].rstrip("/")
TOKEN = None

def call(method, path, body=None, auth=True):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if auth and TOKEN:
        req.add_header("Authorization", "Bearer " + TOKEN)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try: parsed = json.loads(raw)
        except Exception: parsed = {"raw": raw.decode(errors="replace")}
        return e.code, parsed

def must(status, payload, what, ok=(200, 201, 204)):
    if status not in ok:
        print(f"!! {what} failed ({status}): {json.dumps(payload)[:400]}"); sys.exit(1)
    return payload

print(f"==> Waiting for Directus at {BASE} ...")
for _ in range(90):
    try:
        s, _p = call("GET", "/server/health", auth=False)
        if s == 200: break
    except Exception: pass
    time.sleep(2)
else:
    print("!! Directus did not become healthy"); sys.exit(1)

print("==> Login")
s, p = call("POST", "/auth/login", {"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]}, auth=False)
TOKEN = must(s, p, "login")["data"]["access_token"]

# ---------------------------------------------------------------- collections
s, p = call("GET", "/collections")
existing = {c["collection"] for c in must(s, p, "list collections")["data"]}

def pk():
    return {"field": "id", "type": "integer",
            "meta": {"hidden": True, "interface": "input", "readonly": True},
            "schema": {"is_primary_key": True, "has_auto_increment": True}}

print("==> Collections")
if "categories" not in existing:
    must(*call("POST", "/collections", {
        "collection": "categories",
        "meta": {"icon": "label", "note": "Event categories", "display_template": "{{name}}", "sort_field": "name"},
        "schema": {},
        "fields": [pk(),
            {"field": "name", "type": "string", "meta": {"interface": "input", "required": True, "width": "half"}, "schema": {"is_nullable": False}},
            {"field": "slug", "type": "string", "meta": {"interface": "input", "required": True, "width": "half", "options": {"slug": True}}, "schema": {"is_unique": True}}]}),
        "create categories")
    print("    created categories")
else:
    print("    categories exists")

if "events" not in existing:
    must(*call("POST", "/collections", {
        "collection": "events",
        "meta": {"icon": "event", "note": "Events directory", "display_template": "{{title}}",
                 "archive_field": "status", "archive_value": "archived", "unarchive_value": "draft", "sort_field": "starts_at"},
        "schema": {},
        "fields": [pk(),
            {"field": "status", "type": "string",
             "meta": {"interface": "select-dropdown", "width": "half", "display": "labels",
                      "options": {"choices": [{"text": "Published", "value": "published"}, {"text": "Draft", "value": "draft"}, {"text": "Archived", "value": "archived"}]},
                      "display_options": {"showAsDot": True, "choices": [
                          {"text": "Published", "value": "published", "foreground": "#FFFFFF", "background": "var(--theme--primary)"},
                          {"text": "Draft", "value": "draft", "foreground": "#18222F", "background": "#D3DAE4"},
                          {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "var(--theme--warning)"}]}},
             "schema": {"default_value": "draft", "is_nullable": False}},
            {"field": "title", "type": "string", "meta": {"interface": "input", "required": True}, "schema": {}},
            {"field": "slug", "type": "string", "meta": {"interface": "input", "required": True, "options": {"slug": True}}, "schema": {"is_unique": True}},
            {"field": "starts_at", "type": "timestamp", "meta": {"interface": "datetime", "required": True, "width": "half"}, "schema": {}},
            {"field": "ends_at", "type": "timestamp", "meta": {"interface": "datetime", "width": "half"}, "schema": {}},
            {"field": "venue", "type": "string", "meta": {"interface": "input", "width": "half"}, "schema": {}},
            {"field": "city", "type": "string", "meta": {"interface": "input", "width": "half"}, "schema": {}},
            {"field": "description", "type": "text", "meta": {"interface": "input-multiline"}, "schema": {}},
            {"field": "category", "type": "integer",
             "meta": {"interface": "select-dropdown-m2o", "special": ["m2o"], "display": "related-values",
                      "display_options": {"template": "{{name}}"}, "width": "half"},
             "schema": {}}]}),
        "create events")
    print("    created events")
    must(*call("POST", "/relations", {
        "collection": "events", "field": "category", "related_collection": "categories",
        "meta": {"one_deselect_action": "nullify"}, "schema": {"on_delete": "SET NULL"}}), "create relation events.category")
    print("    created relation events.category -> categories")
else:
    print("    events exists")

# ---------------------------------------------------------------- public policy permissions (Directus 11)
print("==> Public read permissions")
PUBLIC_POLICY_ID = "abf8a154-5b1c-4a46-ac9c-7300570f4f17"   # fixed id of the built-in Public policy
s, p = call("GET", "/policies?fields=id,name&limit=-1")
policies = must(s, p, "list policies")["data"]
public = next((x for x in policies if x["id"] == PUBLIC_POLICY_ID), None) \
      or next((x for x in policies if "public" in str(x.get("name", "")).lower()), None)
if not public:
    print("!! Public policy not found"); sys.exit(1)

def ensure_permission(collection, action, rule):
    s, p = call("GET", f"/permissions?filter[policy][_eq]={public['id']}&filter[collection][_eq]={collection}&filter[action][_eq]={action}&limit=1")
    if must(s, p, "list permissions")["data"]:
        print(f"    {collection}.{action} already granted"); return
    must(*call("POST", "/permissions", {"policy": public["id"], "collection": collection, "action": action,
                                        "fields": ["*"], "permissions": rule, "validation": None, "presets": None}),
         f"grant {collection}.{action}")
    print(f"    granted {collection}.{action}")

ensure_permission("categories", "read", {})
ensure_permission("events", "read", {"_and": [{"status": {"_eq": "published"}}]})

# ---------------------------------------------------------------- seed
print("==> Seed data")
CATEGORIES = [{"name": "Konser", "slug": "konser"}, {"name": "Atölye", "slug": "atolye"}, {"name": "Sergi", "slug": "sergi"}]
EVENTS = [
    ("Kadıköy Caz Akşamı", "kadikoy-caz-aksami", "2026-10-03T19:30:00", "2026-10-03T22:00:00", "Yeldeğirmeni Sanat", "İstanbul", "konser", "published",
     "Genç caz üçlüsünden standartlar ve kendi besteleri. Kapı 19:00'da açılır."),
    ("Ekşi Maya Ekmek Atölyesi", "eksi-maya-ekmek-atolyesi", "2026-10-05T10:00:00", "2026-10-05T14:00:00", "Bostanlı Mutfak", "İzmir", "atolye", "published",
     "Kendi mayanızı kurup evde fırınlamayı öğrenin. Malzemeler dahildir, 12 kişi ile sınırlıdır."),
    ("Kent Fotoğrafları 1970–1990", "kent-fotograflari-1970-1990", "2026-10-08T11:00:00", "2026-11-30T18:00:00", "CerModern", "Ankara", "sergi", "published",
     "Üç fotoğrafçının arşivinden başkentin dönüşümü. Pazartesi hariç her gün açık."),
    ("Bağımsız Plak Günü", "bagimsiz-plak-gunu", "2026-10-11T13:00:00", "2026-10-11T20:00:00", "Karga Bar", "İstanbul", "konser", "published",
     "Yerel plakçılar, DJ setleri ve akşam iki canlı performans."),
    ("Seramik: Çarkta İlk Adım", "seramik-carkta-ilk-adim", "2026-10-12T15:00:00", "2026-10-12T18:00:00", "Kil Atölyesi Alsancak", "İzmir", "atolye", "published",
     "Hiç çark başına oturmamış olanlar için üç saatlik giriş."),
    ("Anadolu Rock Gecesi", "anadolu-rock-gecesi", "2026-10-17T21:00:00", "2026-10-17T23:30:00", "IF Performance Hall", "Ankara", "konser", "published",
     "70'lerin repertuvarına çağdaş bir yorum. 18 yaş üzeri."),
    ("Bornova Açık Hava Sineması", "bornova-acik-hava-sinemasi", "2026-10-18T20:30:00", "2026-10-18T22:30:00", "Bornova Belediyesi Parkı", "İzmir", "sergi", "published",
     "Kısa film seçkisi ve yönetmen söyleşisi. Ücretsiz, battaniyenizi getirin."),
    ("Yayın Atölyesi: Kendi Fanzinin", "yayin-atolyesi-kendi-fanzinin", "2026-10-25T12:00:00", "2026-10-25T17:00:00", "Salt Beyoğlu", "İstanbul", "atolye", "draft",
     "Taslak: fotokopiyle üretimden dağıtıma fanzin yapımı. Henüz yayımlanmadı."),
]

s, p = call("GET", "/items/categories?aggregate[count]=*")
if int(must(s, p, "count categories")["data"][0]["count"]) == 0:
    must(*call("POST", "/items/categories", CATEGORIES), "seed categories")
    print(f"    seeded {len(CATEGORIES)} categories")
else:
    print("    categories already seeded")

s, p = call("GET", "/items/categories?fields=id,slug&limit=-1")
cat_ids = {c["slug"]: c["id"] for c in must(s, p, "read categories")["data"]}

s, p = call("GET", "/items/events?aggregate[count]=*")
if int(must(s, p, "count events")["data"][0]["count"]) == 0:
    rows = [{"title": t, "slug": sl, "starts_at": st, "ends_at": en, "venue": v, "city": c,
             "category": cat_ids.get(cs), "status": status, "description": d}
            for (t, sl, st, en, v, c, cs, status, d) in EVENTS]
    must(*call("POST", "/items/events", rows), "seed events")
    print(f"    seeded {len(EVENTS)} events ({sum(1 for e in EVENTS if e[7]=='published')} published, {sum(1 for e in EVENTS if e[7]=='draft')} draft)")
else:
    print("    events already seeded")

# ---------------------------------------------------------------- verify anonymously
s, p = call("GET", "/items/events?filter[status][_eq]=published&fields=id,title,city,category.name&limit=-1", auth=False)
must(s, p, "anonymous read")
print(f"==> Anonymous GET /items/events -> {s}, {len(p['data'])} published events visible")
print("Done.")
PY

if [ "${1:-}" = "--snapshot" ]; then
  echo "==> Exporting schema snapshot to snapshot/schema.yaml"
  npx directus schema snapshot --yes ./snapshot/schema.yaml
  ls -la snapshot/schema.yaml
fi
