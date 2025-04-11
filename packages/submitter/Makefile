include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
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
	@bun test
.PHONY: test

test-watch: ## Run the submitter tests
	@bun test --watch
.PHONY: test-watch

##@ HappyBuild

setup: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: setup

build: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
	ln -sf ../build/cli ./dist/cli;
.PHONY: build

build.watch: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: build.watch

clean: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: clean

dev: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: dev

# Sets up the symlink necessary for vite dev to work across the monorepo, but only if a build is not present.
# This is a :: rule that can be repeated to be extended with more commands.
setup-symlinks:
	@mkdir -p dist
	@if ! [[ -r ./dist/index.es.js ]]; then \
  		ln -sf ../lib/index.ts ./dist/index.es.js; \
  		ln -sf ../lib/index.ts ./dist/index.es.d.ts; \
		mkdir -p node_modules/.tmp; \
		touch node_modules/.tmp/.dev; \
	fi
	@if ! [[ -r ./dist/client.es.js ]]; then \
  		ln -sf ../lib/client.ts ./dist/client.es.js; \
  		ln -sf ../lib/client.ts ./dist/client.es.d.ts; \
	fi
	@if ! [[ -r ./dist/cli ]]; then \
  		ln -sf ../bin/cli.ts ./dist/cli; \
	fi
.PHONY: setup-symlinks

node_modules: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@

dist:
	@$(MAKE) -f ../../makefiles/bundling.mk $@
