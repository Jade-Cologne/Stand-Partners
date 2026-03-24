include .env.local
export

BASE_URL ?= https://stand.partners
STOP = curl -k -X POST "$(BASE_URL)/api/admin/stop" -H "x-admin-key: $(ADMIN_KEY)" -H "Content-Type: application/json"

.PHONY: crawl discover discover-claude enrich-urls discover-all discover-state discover-states \
        list-no-url stop-crawl stop-discover stop-discover-claude stop-enrich-urls stop-all

crawl:
	curl -k -X POST $(BASE_URL)/api/admin/crawl -H "x-admin-key: $(ADMIN_KEY)"

discover:
	curl -k -X POST $(BASE_URL)/api/admin/discover -H "x-admin-key: $(ADMIN_KEY)"

discover-claude:
	curl -k -X POST $(BASE_URL)/api/admin/discover-claude -H "x-admin-key: $(ADMIN_KEY)"

enrich-urls:
	curl -k -X POST "$(BASE_URL)/api/admin/enrich-urls" -H "x-admin-key: $(ADMIN_KEY)"

discover-all:
	curl -k -X POST "$(BASE_URL)/api/admin/discover?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
	curl -k -X POST "$(BASE_URL)/api/admin/discover-claude?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
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
data = json.load(sys.stdin)
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
	@curl -ks "$(BASE_URL)/api/orchestras" | python3 -c "$$LIST_NO_URL_PY"

stop-crawl:
	$(STOP) -d '{"job":"crawl"}'

stop-discover:
	$(STOP) -d '{"job":"discover"}'

stop-discover-claude:
	$(STOP) -d '{"job":"discover_claude"}'

stop-enrich-urls:
	$(STOP) -d '{"job":"enrich_urls"}'

stop-all:
	$(STOP) -d '{"job":"crawl"}'
	$(STOP) -d '{"job":"discover"}'
	$(STOP) -d '{"job":"discover_claude"}'
	$(STOP) -d '{"job":"enrich_urls"}'
