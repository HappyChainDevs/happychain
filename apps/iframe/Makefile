include ../../makefiles/lib.mk
include ../../makefiles/vite.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

# Routes must be built before tsc runs.
dist: src/routeTree.gen.ts

# Regenerates tanstack router routes
src/routeTree.gen.ts: $(shell echo `ls src/routes/**/*.tsx`)
	tsr generate;
	touch src/routeTree.gen.ts # if file wouldn't change, still mark as updated

test: ## Runs tests
	@vitest run;
.PHONY: test

test.watch: ## Runs tests in watch mode
	@vitest watch;
.PHONY: test.watch