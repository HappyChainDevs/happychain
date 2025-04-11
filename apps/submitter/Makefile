include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

dev: 
	@NODE_ENV=development bun --bun --hot src/index.ts
.PHONY: dev

prod: ## Start the local dev server for development
	@NODE_ENV=production bun --bun run build/index.es.js
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

clean: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: clean

setup: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: setup

build: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: build

build.watch: 
	@$(MAKE) -f ../../makefiles/bundling.mk $@
.PHONY: build.watch

setup-symlinks:
	@mkdir -p dist
	@if ! [[ -r ./dist/index.es.js ]]; then \
		ln -sf ../src/index.ts ./dist/index.es.js; \
		ln -sf ../src/index.ts ./dist/index.es.d.ts; \
		mkdir -p node_modules/.tmp; \
		touch node_modules/.tmp/.dev; \
	fi
.PHONY: setup-symlinks
