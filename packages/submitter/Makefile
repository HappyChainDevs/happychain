include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

-include .env

migrate: ## Runs latest migrations
	@./dist/cli migrate latest
.PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi;
	@./dist/cli migrate latest
.PHONY: migrate-fresh

migrate-rollback: ## Rollsback latest migrations
	@./dist/cli migrate down
.PHONY: rollback

routes: ## Display all available routes
	@./dist/cli routes
.PHONY: routes

test: ## Run the submitter tests
	@bun test --bail
.PHONY: test

test-watch: ## Run the submitter tests
	@bun test --watch
.PHONY: test-watch

setup-symlinks::
	@if ! [ -r ./dist/client.es.js ]; then \
  		ln -sf ../lib/client.ts ./dist/client.es.js; \
  		ln -sf ../lib/client.ts ./dist/client.es.d.ts; \
	fi
	@if ! [ -r ./dist/cli ]; then \
  		ln -sf ../bin/cli.ts ./dist/cli; \
	fi
.PHONY: setup-symlinks