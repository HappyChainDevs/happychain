include ../../makefiles/lib.mk
include ../../makefiles/vite.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

# Routes must be built before tsc runs.
dist: routes

# Regenerates tanstack router routes
routes:
	tsr generate;
.PHONY: routes

test: ## Runs tests
	@vitest run;
.PHONY: test

test.watch: ## Runs tests in watch mode
	@vitest watch;
.PHONY: test.watch
