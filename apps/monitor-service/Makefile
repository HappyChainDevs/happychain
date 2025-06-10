SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

start: ## Starts the monitor service
	node --env-file=.env dist/index.es.js
.PHONY: start

migrate: ## Runs pending migrations
	node --env-file=.env dist/migrate.es.js
PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${TXM_DB_PATH} ]; then rm ${TXM_DB_PATH}; fi;
	node --env-file=.env dist/migrate.es.js
.PHONY: migrate-fresh