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

# Migration targets for leaderboard-backend (using Bun)

migrate: ## Runs latest migrations
	@echo "Running latest migrations..."
	@bun run src/db/migrate.ts
.PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${LEADERBOARD_DB_URL} ]; then rm ${LEADERBOARD_DB_URL}; fi;
	@echo "Running latest migrations on fresh DB..."
	@bun run src/db/migrate.ts
.PHONY: migrate-fresh

# NOTE: migrate-rollback is not implemented in migrate.ts; add support if needed
migrate-rollback: ## Rollsback latest migrations (not implemented)
	@echo "Rollback not implemented in migrate.ts. Implement if needed."
.PHONY: migrate-rollback