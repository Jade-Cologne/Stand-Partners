include .env.local
export

BASE_URL ?= https://stand.partners
STOP = curl -k -X POST "$(BASE_URL)/api/admin/stop" -H "x-admin-key: $(ADMIN_KEY)" -H "Content-Type: application/json"

.PHONY: crawl discover discover-claude enrich-urls discover-all discover-state discover-states \
        stop-crawl stop-discover stop-discover-claude stop-enrich-urls stop-all

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
