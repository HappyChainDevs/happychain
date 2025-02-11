include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

##@ Submitter

dev: ## Start the local dev server for development
	@bun run --hot src/index.ts
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

setup: node_modules
.PHONY: setup

node_modules: package.json
	@bun install;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;
