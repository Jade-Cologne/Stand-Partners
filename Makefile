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

discover-all:
	curl -k -X POST "$(BASE_URL)/api/admin/discover?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
	curl -k -X POST "$(BASE_URL)/api/admin/discover-claude?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
	curl -k -X POST "$(BASE_URL)/api/admin/crawl?sync=true" -H "x-admin-key: $(ADMIN_KEY)"
