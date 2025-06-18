SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

start: ## Starts the monitor service
	bun run src/index.ts
.PHONY: start

migrate: ## Runs pending migrations
	bun run src/migrate.ts
PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${TXM_DB_PATH} ]; then rm ${TXM_DB_PATH}; fi;
	bun run src/migrate.ts
.PHONY: migrate-fresh