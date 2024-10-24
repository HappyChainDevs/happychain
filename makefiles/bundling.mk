# Fragment to be imported in packages that need to bundle their typescript code.
##@ HappyBuild

SRC_ROOT_DIR ?= lib

setup: node_modules setup-symlinks
.PHONY: setup

build: node_modules dist ## Build and bundle the package
.PHONY: build

build.watch: node_modules  ## Build the package in watch mode
	@happyBuild --config build.config.ts --watch;
.PHONY: build.watch

clean: ## Removes build artifacts
	@rm -rf dist
	@rm -rf node_modules/.tmp
	@make setup-symlinks
.PHONY: clean

dev: node_modules ## Symlinks source code entries into 'dist'
	@echo "$(PKG) — removing dist & installing dev symlinks"
	@make clean
.PHONY: dev

# Sets up the symlink necessary for vite dev to work across the monorepo, but only if they
# a build is not present.
# This is a :: rule that can be repeated to be extended with more commands.
setup-symlinks::
	@mkdir -p dist
	@if ! [[ -r ./dist/index.es.js ]]; then \
  		ln -s ../$(SRC_ROOT_DIR)/index.ts ./dist/index.es.js; \
  		ln -s ../$(SRC_ROOT_DIR)/index.ts ./dist/index.es.d.ts; \
		mkdir -p node_modules/.tmp; \
		touch node_modules/.tmp/.dev; \
	fi
.PHONY: setup-symlinks

node_modules: package.json
	@bun install;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

DIST_DEPS := $(shell find . \
	-type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" \) \
	-not -path "./dist/*")

# If the `.dev` file exists, forces build to run.
# We need this because when running `make dev`, `touch` can update `.dev` with the same (not higher)
# timestamp then the new `dist`.
FORCE_UDPATE := $(shell test -f node_modules/.tmp/.dev && echo force_update)

dist: $(DIST_DEPS) $(FORCE_UDPATE)
	@happyBuild --config build.config.ts;
	@# force updates modified_at timestamp
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

force_update:
.PHONY: force_update
