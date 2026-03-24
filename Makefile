include .env.local
export

BASE_URL ?= https://stand.partners

.PHONY: crawl discover discover-claude discover-all

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
