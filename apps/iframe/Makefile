include ../../makefiles/lib.mk
include ../../makefiles/vite.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

# Routes must be built before tsc runs.
dist: src/routeTree.gen.ts

# Regenerates tanstack router routes
src/routeTree.gen.ts: $(shell ls src/routes/**/*.tsx)
	tsr generate;

test: ## Runs tests
	@vitest run;
.PHONY: test

test.watch: ## Runs tests in watch mode
	@vitest watch;
.PHONY: test.watch
