TSC_BIN ?= tsc

##@ Vite

# Like build.watch but also serves the page on localhost if applicable
dev: node_modules ## Serves or bundles the package in watch mode
	@if [[ -r index.html ]]; then \
	  concurrently --prefix=none "make build.watch" "bunx --bun vite"; \
	else \
		make build.watch; \
	fi
.PHONY: dev

build: node_modules dist ## Builds the vite application
.PHONY: build

clean: ## Removes build artifacts
	@rm -rf dist
	@rm -rf node_modules/.tmp
	@rm -rf node_modules/.vite # this sometimes gets corrupted ("cannot load vite.config.ts")
.PHONY: clean

# Rebuilds on file change, but does not bundle — site can still be served locally via `vite`
build.watch: node_modules
	@$(TSC_BIN) --build --watch --preserveWatchOutput;
.PHONY: build.watch

preview: node_modules dist ## Serves the production mode package
	@bunx --bun vite preview;
.PHONY: preview

# You can add dependencies to this rule in the Makefile in which `vite.mk` is inluded.
dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.vue" \) -not -path "./dist/*")
	@$(TSC_BIN) --build;
	@bunx --bun vite build;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

node_modules: package.json
	@bun install
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;
