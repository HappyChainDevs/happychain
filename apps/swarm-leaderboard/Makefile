include ../../makefiles/lib.mk
include ../../makefiles/bundling.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

dev: node_modules reset-dev
	@NODE_ENV=development bun --bun --hot src/index.ts;
.PHONY: dev

prod: build ## Start the local dev server for development
	@NODE_ENV=production bun --bun run build/index.es.js;
.PHONY: prod

migrate: ## Runs latest migrations
	@echo "TODO: Run your migration tool here, e.g. kysely migrate up"
.PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi;
	@echo "TODO: Run your migration tool here, e.g. kysely migrate up"
.PHONY: migrate-fresh

migrate-rollback: ## Rollsback latest migrations
	@echo "TODO: Run your migration tool here, e.g. kysely migrate down"
.PHONY: migrate-rollback