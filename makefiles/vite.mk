TSC_BIN ?= tsc

##@ Vite

setup: node_modules reset-dev
.PHONY: setup

# Like build.watch but also serves the page on localhost if applicable
dev: node_modules reset-dev ## Serves or bundles the package in watch mode
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
	@make reset-dev
.PHONY: clean

reset-dev:
	@if [ ! -f node_modules/.tmp/.dev ] && [ -d dist ]; then \
		rm -rf dist.prod; \
		mv dist dist.prod; \
	fi
.PHONY: reset-dev

# Rebuilds on file change, but does not bundle — site can still be served locally via `vite`
build.watch: node_modules
	@$(TSC_BIN) --build --watch --preserveWatchOutput;
.PHONY: build.watch

preview: node_modules dist ## Serves the production mode package
	@bunx --bun vite preview;
.PHONY: preview

DIST_DEPS := $(shell find . \
	-type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" \
		-o -name "*.html" -o -name "*.vue" -o -name "Makefile" \) \
	-not -path "./dist/*")

# If the `.dev` file exists, forces build to run.
# We need this because when running `make dev`, `touch` can update `.dev` with the same (not higher)
# timestamp then the new `dist`.
FORCE_UDPATE := $(shell test -f node_modules/.tmp/.dev && echo force_update)

# You can add dependencies to this rule in the Makefile in which `vite.mk` is inluded.
dist: $(DIST_DEPS) $(FORCE_UDPATE)
	@rm -f node_modules/.tmp/.dev;
	@if [ -d dist.prod ]; then \
		rm -rf dist; \
		mv dist.prod dist; \
		make -s dist || exit 1; \
	else \
		$(TSC_BIN) --build || exit 1; \
		NODE_ENV=production bunx --bun vite build || exit 1; \
		touch dist; \
	fi

node_modules: package.json
	@ bun install
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

force_update:
.PHONY: force_update