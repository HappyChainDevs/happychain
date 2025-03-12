include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

##@ Submitter

dev: ## Start the local dev server for development
	@NODE_ENV=development bun --bun run --hot src/index.ts
.PHONY: dev

routes: ## Display all available routes
	@NODE_ENV=cli bun run src/cli.ts --showRoutes
.PHONY: routes

test: ## Run the submitter tests
	@bun test
.PHONY: test

test-watch: ## Run the submitter tests
	@bun test --watch
.PHONY: test-watch

clean: ## Removes build artifacts
	@rm -rf node_modules
.PHONY: clean

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi;
	@make migrate
.PHONY: migrate-fresh

migrate: ## Runs latest migrations
	@bun --bun kysely migrate:latest
	@make migrate-types
.PHONY: migrate

rollback: ## Rollsback latest migrations
	@bun --bun kysely migrate:rollabck
	@make migrate-types
.PHONY: rollback

migrate-types:
	@bun kysely-codegen \
		--dialect kysely-bun-sqlite \
		--singular \
		--overrides="$$(cat .config/codegen-type-overrides.json)" \
		--out-file=src/database/generated.d.ts 
.PHONY: migrate-types

setup: node_modules migrate
.PHONY: setup

node_modules: package.json
	@bun install;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;
