include ../../makefiles/lib.mk
include ../../makefiles/bundling.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

dev: node_modules reset-dev
	@NODE_ENV=development bun --bun --hot src/index.ts;
.PHONY: dev

prod: build ## Start the local dev server for development
	@NODE_ENV=production bun --bun run build/index.es.js;
.PHONY: prod

migrate: ## Runs latest migrations
	@submitter-cli migrate latest
.PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi;
	@submitter-cli migrate latest
.PHONY: migrate-fresh

migrate-rollback: ## Rollsback latest migrations
	@submitter-cli migrate down
.PHONY: rollback