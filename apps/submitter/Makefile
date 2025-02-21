include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

##@ Submitter

dev: ## Start the local dev server for development
	@NODE_ENV=development bun --bun run --hot src/index.ts
.PHONY: dev

routes: ## Display all available routes
	@bun run src/cli.ts --showRoutes
.PHONY: routes

test: ## Run the submitter tests
	@bun test
.PHONY: dev

clean: ## Removes build artifacts
	@rm -rf node_modules
.PHONY: clean

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi
	@make migrate
.PHONY: migrate-fresh

migrate: ## Runes latest migrations
	@bun --bun kysely migrate:latest
	@bun kysely-codegen \
		--dialect kysely-bun-sqlite \
		--singular \
		--overrides="$$(cat .config/codegen-type-overrides.json)" \
		--out-file=src/database/generated.d.ts 
.PHONY: migrate

setup: node_modules migrate
.PHONY: setup

node_modules: package.json
	@bun install;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;
