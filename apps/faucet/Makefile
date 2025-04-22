SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

start: ## Starts the faucet service
	node --env-file=.env dist/index.es.js
.PHONY: start

migrate: ## Runs pending migrations
	node --env-file=.env dist/migrate.es.js
PHONY: migrate