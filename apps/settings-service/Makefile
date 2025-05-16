SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

start: ## Starts the settings service
	bun run --hot src/index.ts
.PHONY: start

migrate: ## Runs pending migrations
	bun run src/migrate.ts
.PHONY: migrate