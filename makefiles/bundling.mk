# Fragment to be imported in packages that need to bundle their typescript code.
##@ HappyBuild

SRC_ROOT_DIR ?= lib

setup: node_modules reset-dev
.PHONY: setup

build: node_modules dist ## Build and bundle the package
.PHONY: build

build.watch: node_modules  ## Build the package in watch mode
	@happybuild --config build.config.ts --watch;
.PHONY: build.watch

clean: ## Removes build artifacts
	@rm -rf dist
	@rm -rf build
	@rm -rf dist.prod
	@rm -rf node_modules/.tmp
	@make reset-dev
.PHONY: clean

reset-dev:
	@if [ ! -f node_modules/.tmp/.dev ] && [ -d dist ]; then \
  		rm -rf dist.prod; \
  		mv dist dist.prod; \
	fi
	@make setup-symlinks
.PHONY: reset-dev

## Symlinks source code entries into 'dist'
dev: node_modules reset-dev
.PHONY: dev

# Sets up the symlink necessary for vite dev to work across the monorepo, but only if a build is not present.
# This is a :: rule that can be repeated to be extended with more commands.
setup-symlinks::
	@mkdir -p dist
	@if ! [ -r ./dist/index.es.js ]; then \
  		ln -sf ../$(SRC_ROOT_DIR)/index.ts ./dist/index.es.js; \
  		ln -sf ../$(SRC_ROOT_DIR)/index.ts ./dist/index.es.d.ts; \
		mkdir -p node_modules/.tmp; \
		touch node_modules/.tmp/.dev; \
	fi
.PHONY: setup-symlinks

node_modules: package.json
	@bun install;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

DIST_DEPS := $(shell find . \
	-type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "Makefile" \) \
	-not -path "./dist/*")

# If the `.dev` file exists, forces build to run.
# We need this because when running `make dev`, `touch` can update `.dev` with the same (not higher)
# timestamp then the new `dist`.
FORCE_UDPATE := $(shell test -f node_modules/.tmp/.dev && echo force_update)

dist: $(DIST_DEPS) $(FORCE_UDPATE)
	@rm -f node_modules/.tmp/.dev;
	@if [ -d dist.prod ]; then \
		rm -rf dist; \
		mv dist.prod dist; \
		make dist || exit 1; \
	else \
		NODE_ENV=production happybuild --config build.config.ts || exit 1; \
		touch dist; \
	fi

force_update:
.PHONY: force_update
