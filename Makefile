include .env.local
export

BASE_URL ?= https://stand.partners
STOP = curl -k -X POST "$(BASE_URL)/api/admin/stop" -H "x-admin-key: $(ADMIN_KEY)" -H "Content-Type: application/json"

.PHONY: crawl discover discover-claude enrich-urls geocode discover-all discover-state discover-states \
        list-no-url list-no-audition-page list-crawl-errors list-archived-discoveries status jobs \
        clean-report clean-data reset-orchestras \
        stop-crawl stop-discover stop-claude stop-enrich-urls stop-geocode stop-all

crawl:
	curl -k -X POST $(BASE_URL)/api/admin/crawl -H "x-admin-key: $(ADMIN_KEY)"

discover:
	curl -k -X POST $(BASE_URL)/api/admin/discover -H "x-admin-key: $(ADMIN_KEY)"

discover-claude:
	curl -k -X POST $(BASE_URL)/api/admin/discover-claude -H "x-admin-key: $(ADMIN_KEY)"

enrich-urls:
	curl -k -X POST "$(BASE_URL)/api/admin/enrich-urls" -H "x-admin-key: $(ADMIN_KEY)"

geocode:
	curl -k -X POST "$(BASE_URL)/api/admin/geocode" -H "x-admin-key: $(ADMIN_KEY)"

discover-all:
	curl -k -X POST "$(BASE_URL)/api/admin/discover?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
	curl -k -X POST "$(BASE_URL)/api/admin/discover-claude?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
	curl -k -X POST "$(BASE_URL)/api/admin/enrich-urls?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
	curl -k -X POST "$(BASE_URL)/api/admin/crawl?sync=true" -H "x-admin-key: $(ADMIN_KEY)"

discover-state:
	curl -k -X POST "$(BASE_URL)/api/admin/discover-claude-state?sync=true" -H "x-admin-key: $(ADMIN_KEY)" -H "Content-Type: application/json" -d '{"state":"$(STATE)"}'

discover-states:
	@echo '$(STATES)' | tr ',' '\n' | while read state; do \
		curl -k -s -X POST "$(BASE_URL)/api/admin/discover-claude-state" -H "x-admin-key: $(ADMIN_KEY)" -H "Content-Type: application/json" -d "{\"state\":\"$$state\"}" & \
		sleep 2; \
	done; wait

define LIST_NO_URL_PY
import json, sys
raw = json.load(sys.stdin)
data = raw.get('items', raw) if isinstance(raw, dict) else raw
if not isinstance(data, list): print(f'Unexpected API response: {raw}'); sys.exit(1)
missing = [o for o in data if not o.get('website')]
missing.sort(key=lambda o: (o.get('state') or '', o.get('name') or ''))
print(f'Orchestras without a website URL: {len(missing)}\n')
print(f'{"Name":<50} {"City":<20} {"State":<6} {"Type"}')
print('-' * 95)
for o in missing:
    print(f'{o["name"]:<50} {(o.get("city") or ""):<20} {(o.get("state") or ""):<6} {o.get("type","")}')
endef
export LIST_NO_URL_PY

list-no-url:
	@curl -ksL "$(BASE_URL)/api/orchestras/?limit=500" | python3 -c "$$LIST_NO_URL_PY"

define LIST_CRAWL_ERRORS_PY
import json, sys
raw = json.load(sys.stdin)
data = raw.get('items', raw) if isinstance(raw, dict) else raw
if not isinstance(data, list): print(f'Unexpected API response: {raw}'); sys.exit(1)
errors = [o for o in data if o.get('crawl_error')]
errors.sort(key=lambda o: (o.get('state') or '', o.get('name') or ''))
print(f'Orchestras with crawl errors: {len(errors)}\n')
print(f'{"Name":<50} {"State":<6} {"Error"}')
print('-' * 110)
for o in errors:
    print(f'{o["name"]:<50} {(o.get("state") or ""):<6} {o.get("crawl_error","")}')
endef
export LIST_CRAWL_ERRORS_PY

list-crawl-errors:
	@curl -ksL "$(BASE_URL)/api/orchestras/?limit=500" | python3 -c "$$LIST_CRAWL_ERRORS_PY"

define LIST_NO_AUDITION_PAGE_PY
import json, sys
raw = json.load(sys.stdin)
data = raw.get('items', raw) if isinstance(raw, dict) else raw
if not isinstance(data, list): print(f'Unexpected API response: {raw}'); sys.exit(1)
missing = [o for o in data if o.get('website') and not o.get('audition_page')]
missing.sort(key=lambda o: (o.get('state') or '', o.get('name') or ''))
print(f'Orchestras with website but no audition page found: {len(missing)}\n')
print(f'{"Name":<50} {"City":<20} {"State":<6} {"Website"}')
print('-' * 120)
for o in missing:
    print(f'{o["name"]:<50} {(o.get("city") or ""):<20} {(o.get("state") or ""):<6} {o.get("website","")}')
endef
export LIST_NO_AUDITION_PAGE_PY

list-no-audition-page:
	@curl -ksL "$(BASE_URL)/api/orchestras/?limit=500" | python3 -c "$$LIST_NO_AUDITION_PAGE_PY"

define LIST_ARCHIVED_PY
import json, sys
raw = json.load(sys.stdin)
data = raw if isinstance(raw, list) else []
state_filter = None
if len(sys.argv) > 1:
    state_filter = sys.argv[1].upper()
    data = [r for r in data if (r.get('state') or '').upper() == state_filter]
print(f'Archived discoveries: {len(data)}\n')
print(f'{"Name":<50} {"City":<20} {"St":<4} {"Reason"}')
print('-' * 120)
for r in data:
    print(f'{(r.get("name") or ""):<50} {(r.get("city") or ""):<20} {(r.get("state") or ""):<4} {r.get("skip_reason","")[:60]}')
endef
export LIST_ARCHIVED_PY

list-archived-discoveries:
	@curl -ksL "$(BASE_URL)/api/admin/discovery-archive?limit=500" -H "x-admin-key: $(ADMIN_KEY)" | python3 -c "$$LIST_ARCHIVED_PY"

define STATUS_PY
import json, sys
raw_str = sys.stdin.read()
try:
    raw = json.loads(raw_str)
except Exception as e:
    print(f'Bad response ({e}): {raw_str[:300]!r}')
    sys.exit(1)
if isinstance(raw, dict) and 'items' in raw:
    data = raw['items']
    total = raw.get('total', len(data))
elif isinstance(raw, list):
    data = raw
    total = len(data)
else:
    print(f'Unexpected API response: {raw}')
    sys.exit(1)
with_website = sum(1 for o in data if o.get('website'))
with_audition_page = sum(1 for o in data if o.get('audition_page'))
crawled = sum(1 for o in data if o.get('last_crawled_at'))
with_errors = sum(1 for o in data if o.get('crawl_error'))
with_auditions = sum(1 for o in data if o.get('active_audition_count', 0) > 0)
with_coords = sum(1 for o in data if o.get('lat') and o.get('lng'))
print(f'stand.partners database status\n{"=" * 35}')
print(f'Total orchestras:       {total}')
print(f'Have website URL:       {with_website} ({with_website*100//total if total else 0}%)')
print(f'Have audition page:     {with_audition_page} ({with_audition_page*100//total if total else 0}%)')
print(f'Have been crawled:      {crawled} ({crawled*100//total if total else 0}%)')
print(f'Have map coordinates:   {with_coords} ({with_coords*100//total if total else 0}%)')
print(f'Have open auditions:    {with_auditions}')
print(f'Have crawl errors:      {with_errors}')
endef
export STATUS_PY

status:
	@curl -ksL "$(BASE_URL)/api/orchestras/?limit=500" | python3 -c "$$STATUS_PY"

jobs:
	@curl -ksL "$(BASE_URL)/api/admin/jobs" -H "x-admin-key: $(ADMIN_KEY)" | python3 -m json.tool

reset-orchestras:
	curl -k -X POST "$(BASE_URL)/api/admin/reset-orchestras" -H "x-admin-key: $(ADMIN_KEY)"

clean-report:
	@curl -ksL -X POST "$(BASE_URL)/api/admin/clean?dry_run=true" -H "x-admin-key: $(ADMIN_KEY)" | python3 -m json.tool

clean-data:
	curl -k -X POST "$(BASE_URL)/api/admin/clean?dry_run=false" -H "x-admin-key: $(ADMIN_KEY)" | python3 -m json.tool

stop-crawl:
	$(STOP) -d '{"job":"crawl"}'

stop-discover:
	$(STOP) -d '{"job":"discover"}'

stop-claude:
	$(STOP) -d '{"job":"discover_claude"}'

stop-enrich-urls:
	$(STOP) -d '{"job":"enrich_urls"}'

stop-geocode:
	$(STOP) -d '{"job":"geocode"}'

stop-all:
	$(STOP) -d '{"job":"crawl"}'
	$(STOP) -d '{"job":"discover"}'
	$(STOP) -d '{"job":"discover_claude"}'
	$(STOP) -d '{"job":"enrich_urls"}'
	$(STOP) -d '{"job":"geocode"}'
