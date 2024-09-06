# Make entire file 'silent' (unless make VERBOSE=1)
ifndef VERBOSE
	MAKEFLAGS += --silent
endif

include makefiles/lib.mk

help: ## Show this help
	@echo ""
	@echo "Specify a command. The choices are:"
	@echo ""
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[0;36m%-12s\033[m %s\n", $$1, $$2}'
	@echo ""
.PHONY: help

# ==================================================================================================
# Packages

# build & format all support packages with no internal dependencies
SUPPORT_PKGS := configs,contracts,common,sdk-shared,sdk-firebase-web3auth-strategy
# build & format sdk packages which are built using the above
SDK_PKGS := sdk-vanillajs,sdk-react
# build & format consuming 'apps'
APP_PKGS := iframe,demo-vanillajs,demo-react,demo-wagmi-vue,docs

# Currently Active Branch
YOUR_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
# Lead branch
DEFAULT_BRANCH := master

# ==================================================================================================
# BASICS COMMANDS
#   To get the project running locally.

setup: install-frozen enable-hooks ## To be run when first setting up the repository.
	cd packages/contracts && make setup
.PHONY: setup

anvil: ## Runs anvil (local EVM node)
	cd packages/contracts && make anvil
.PHONY: anvil

deploy: ## Deploys contracts to Anvil
	cd packages/contracts && make deploy
.PHONY: deploy

build: support.build sdk.build apps.build node_modules ## Creates production builds
.PHONY: build

docs: node_modules ## Builds latest docs and starts dev server http://localhost:4173
	cd packages/docs && make build && make preview
.PHONY: docs

check: node_modules support.check sdk.check apps.check ## Runs code quality & formatting checks
	@# cf. makefiles/formatting.mk
	biome check ./;
.PHONY: check

format: support.format sdk.format apps.format ## Formats code and tries to fix code quality issues
	biome check ./ --write;
.PHONY: format

test: sdk.test ## Run tests
.PHONY: test

clean: support.clean sdk.clean apps.clean ## Removes build artifacts
.PHONY: clean

nuke: remove-modules clean ## Removes build artifacts and dependencies
.PHONY: nuke

# ==================================================================================================
# DEMOS

demo-react:
	make -j 2 iframe.dev demo-react.dev
.PHONY: demo-react

demo-vanillajs:
	make -j 2 iframe.dev demo-vanillajs.dev
.PHONY: demo-vanillajs

demo-wagmi-vue:
	make -j 2 iframe.dev demo-wagmi-vue.dev
.PHONY: demo-wagmi-vue

# ==================================================================================================
# DEVELOPMENT

# start docs in watch mode (can crash, see packages/docs/Makefile for more info)
docs.watch:
	cd packages/docs && make dev
.PHONY: docs.watch

# Start all SDKs in dev mode
sdk-dev:
	make -j 3 iframe.dev sdk-react.dev sdk-vanillajs.dev
.PHONY: sdk-dev

iframe.dev:
	cd packages/iframe && make dev
.PHONY: iframe.dev

demo-react.dev:
	cd packages/demo-react && make dev
.PHONY: demo-react.dev

demo-vanillajs.dev:
	cd packages/demo-vanillajs && make dev
.PHONY: demo-vanillajs.dev

sdk-react.dev:
	cd packages/sdk-react && make dev
.PHONY: sdk-react.dev

demo-wagmi-vue.dev:
	cd packages/demo-wagmi-vue && make dev
.PHONY: demo-wagmi-vue.dev

sdk-vanillajs.dev:
	cd packages/sdk-vanillajs && make dev
.PHONY: sdk-vanillajs.dev

sdk-react.build:
	cd packages/sdk-react && make build
.PHONY: sdk-react.build

sdk-vanillajs.build:
	cd packages/sdk-vanillajs && make build
.PHONY: sdk-vanillajs.build

# ==================================================================================================
# FORALL

define forall
	$(eval PKGS := $(strip $(1)))
	$(eval TARGET := $(2))
	for name in packages/{$(PKGS)}; do\
		echo "Running make $(TARGET) in $${name}";\
		make $(2) --directory=$${name} || exit 1;\
	done
endef

# ==================================================================================================
# CORRECTNESS

sdk.test:
	cd packages/sdk-shared && make test
	cd packages/sdk-vanillajs && make test
.PHONY: sdk.test

support.check:
	$(call forall , $(SUPPORT_PKGS) , check)
.PHONY: support.check

sdk.check:
	$(call forall , $(SDK_PKGS) , check)
.PHONY: sdk.check

apps.check:
	$(call forall , $(APP_PKGS) , check)
.PHONY: apps.check

support.format:
	$(call forall , $(SUPPORT_PKGS) , format)
.PHONY: support.format

sdk.format:
	$(call forall , $(SDK_PKGS) , format)
.PHONY: sdk.format

apps.format:
	$(call forall , $(APP_PKGS) , format)
.PHONY: apps.format

# Quickly format change files between <your branch> and master using the default settings.
# Note that when the diff is empty, this will fallback to checking the 4 eligible top-level files
# (which is fine).
check-fast-diff:
	biome check \
		$$(git diff --name-only $(YOUR_BRANCH) $$(git merge-base $(YOUR_BRANCH) $(DEFAULT_BRANCH)));
.PHONY: check-fast-diff

# ==================================================================================================
# PRODUCTION BUILDS

support.build:
	$(call forall , $(SUPPORT_PKGS) , build)
.PHONY: support.build

sdk.build:
	$(call forall , $(SDK_PKGS) , build)
.PHONY: sdk.build

apps.build:
	$(call forall , $(APP_PKGS) , build)
.PHONY: apps.build

# Build only the docs (this included in apps.build already)
docs.build:
	cd packages/docs && make dev
.PHONY: docs.build

# ==================================================================================================
# CLEANING

support.clean:
	$(call forall , $(SUPPORT_PKGS) , clean)
.PHONY: support.clean

sdk.clean:
	$(call forall , $(SDK_PKGS) , clean)
.PHONY: sdk.clean

apps.clean:
	$(call forall , $(APP_PKGS) , clean)
.PHONY: apps.clean

# ==================================================================================================
# DEPENDENCY MANAGEMENT
#   Update dependencies, check for outdated dependencies, etc.

# Install packages as specified in the pnpm-lockfile.yaml.
install-frozen:
	pnpm install --frozen-lockfile
.PHONY: install-deps

# NOTES:
#  Below "version specifier" refers to the version strings (e.g. "^1.2.3") in package.json.
#  You can safely use pnpm commands inside the packages, and things will behave like your expect
#  (i.e. update only the package, but use the pnpm monorepo architecture).

# Like npm install: if a version matching version specifier is installed, does nothing, otherwise
# install the most up-to-date version matching the specifier.
install:
	pnpm install -r
	@echo "If the lockfileVersion changed, please update 'packageManager' in package.json!"
.PHONY: install

node_modules: package.json $(wildcard packages/*/package.json)
	@pnpm install -r

# Shows packages for which new versions are available (compared to the installed version).
# This will also show new version that do not match the version specifiers!
outdated:
	pnpm outdated -r
.PHONY: outdated

# Updates all packages to their latest version that match the version specifier.
# It will also update the version specifiers to point to the new version.
# You can also run this if your installed versions are > than the version specifiers and you want
# to update them.
update:
	pnpm update -r
	@echo "If the lockfileVersion changed, please update 'packageManager' in package.json!"
.PHONY: update

# Updates all packages to their latest version (even if they do not match the version specifier!).
# It will also update the version specifiers to point to the new version.
update-latest:
	pnpm update -r --latest
	@echo "If the lockfileVersion changed, please update 'packageManager' in package.json!"
.PHONY: update-latest

remove-modules:
	rm -rf node_modules packages/*/node_modules
.PHONY: remove-modules

# ==================================================================================================
# Extras

# install this to run github workflows locally
# https://nektosact.com/
debug-github-workflow:
	act push
.PHONY: debug-github-workflow

# Enable Git Hooks
enable-hooks:
	husky;
.PHONY: enable-hooks

# Disable Git Hooks
disable-hooks:
	git config --unset core.hooksPath
.PHONY: disable-hooks