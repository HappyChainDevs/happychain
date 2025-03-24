include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

setup-symlinks::
	@if ! [[ -r ./dist/rpc.es.js ]]; then \
  		ln -sf ../lib/rpc.ts ./dist/rpc.es.js; \
  		ln -sf ../lib/rpc.ts ./dist/rpc.es.d.ts; \
	fi
.PHONY: setup-symlinks

migrate: ## Runs latest migrations
	@./bin/cli.ts migrate latest
.PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi;
	@./bin/cli.ts migrate latest
.PHONY: migrate-fresh

migrate-rollback: ## Rollsback latest migrations
	@./bin/cli.ts migrate down
.PHONY: rollback

routes: ## Display all available routes
	@./bin/cli.ts routes
.PHONY: routes

test: ## Run the submitter tests
	@bun test
.PHONY: test

test-watch: ## Run the submitter tests
	@bun test --watch
.PHONY: test-watch
