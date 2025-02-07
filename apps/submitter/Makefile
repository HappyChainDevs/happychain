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
