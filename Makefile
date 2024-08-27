## make entire file 'silent'
MAKEFLAGS += --silent

SHELL := /bin/bash

help: ## Show this help
	@echo ""
	@echo "Specify a command. The choices are:"
	@echo ""
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[0;36m%-12s\033[m %s\n", $$1, $$2}'
	@echo ""
.PHONY: help

# ==================================================================================================
# Packages

# build & format all support packages with no internal dependencies
SUPPORT_PKGS := configs,contracts,common,sdk-shared,sdk-firebase-web3auth-strategy
# build & format sdk packages which are built using the above
SDK_PKGS := sdk-vanillajs,sdk-react
# build & format consuming 'apps'
APP_PKGS := iframe,demo-vanillajs,demo-react,docs

# Currently Active Branch
YOUR_BRANCH = $(git rev-parse --abbrev-ref HEAD)
# Lead branch
DEFAULT_BRANCH = master

# ==================================================================================================
# BASICS COMMANDS
#   To get the project running locally.


setup: install-frozen ## To be run when first setting up the repository.
	make enable-hooks
	cd packages/contracts && make setup
.PHONY: setup

anvil: ## Runs anvil (local EVM node).
	cd packages/contracts && make anvil
.PHONY: anvil

# Deploys to the contracts to the local node (requires anvil to be running).
deploy: ## Deploys Contracts
	cd packages/contracts && make deploy
.PHONY: deploy

# Creates production builds of all packages
build: node_modules ## Run production builds
	make support.build
	make sdk.build
	make apps.build
.PHONY: build

# build latest docs and starts dev server http://localhost:4173
docs: node_modules ## Builds latest docs and starts preview server
	cd packages/docs && make build && make preview
.PHONY: docs

check: node_modules ## Performs code-quality checks.
	make support.check
	make sdk.check
	make apps.check
	@./packages/configs/node_modules/.bin/biome check ./
.PHONY: check

format: ## Fixes code-quality issues
	make support.format
	make sdk.format
	make apps.format
	@./packages/configs/node_modules/.bin/biome check ./ --write
.PHONY: format

test: ## Run tests
	make sdk.test
.PHONY: test

# ==================================================================================================
# Demos

demo-react:
	@echo "Building VanillaJS SDK"
	make sdk-vanillajs.build
	@echo "Starting "
	make -j 2 iframe.dev demo-react.dev
.PHONY: demo-react

demo-vanillajs:
	make -j 2 iframe.dev demo-vanillajs.dev
.PHONY: demo-vanillajs

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
# CORRECTNESS

sdk.test:
	cd packages/sdk-shared && make test
	cd packages/sdk-vanillajs && make test
.PHONY: sdk.test

support.check:
	for name in packages/{$(SUPPORT_PKGS)}; do\
		echo "Checking $${name}";\
		cd $${name} && make check && cd ../../ || exit 1;\
	done
.PHONE: support.check

sdk.check:
	for name in packages/{$(SDK_PKGS)}; do\
		echo "Checking $${name}";\
		cd $${name} && make check && cd ../../ || exit 1;\
	done
.PHONY: sdk.check

apps.check:
	for name in packages/{$(APP_PKGS)}; do\
		echo "Checking $${name}";\
		cd $${name} && make check && cd ../../ || exit 1;\
	done
.PHONY: apps.check

support.format:
	for name in packages/{$(SUPPORT_PKGS)}; do\
		echo "Formatting $${name}";\
		cd $${name} && make format && cd ../../ || exit 1;\
	done
.PHONE: support.format

sdk.format:
	for name in packages/{$(SDK_PKGS)}; do\
		echo "Formatting $${name}";\
		cd $${name} && make format && cd ../../ || exit 1;\
	done
.PHONY: sdk.format

apps.format:
	for name in packages/{$(APP_PKGS)}; do\
		echo "Formatting $${name}";\
		cd $${name} && make format && cd ../../ || exit 1;\
	done
.PHONY: apps.format

# quickly format change files between <your branch> and master
# using default global settings
format-fast-diff:
	@./packages/configs/node_modules/.bin/biome check $(git diff --name-only $(YOUR_BRANCH) $(git merge-base $(YOUR_BRANCH) $(DEFAULT_BRANCH)))
.PHONY: format-fast-diff

# ==================================================================================================
# PRODUCTION BUILDS

support.build:
	for name in packages/{$(SUPPORT_PKGS)}; do\
		echo "Building $${name}";\
		cd $${name} && make build && cd ../../ || exit 1;\
	done
.PHONY: support.build

sdk.build:
	for name in packages/{$(SDK_PKGS)}; do\
		echo "Building $${name}";\
		cd $${name} && make build && cd ../../ || exit 1;\
	done
.PHONY: sdk.build

apps.build:
	for name in packages/{$(APP_PKGS)}; do\
		echo "Building $${name}";\
		cd $${name} && make build && cd ../../ || exit 1;\
	done
.PHONY: apps.build

# build only the docs (this included in apps.build already)
docs.build:
	cd packages/docs && make dev
.PHONY: docs.build

# ==================================================================================================
# IMPLEMENTATION DETAILS

# NOTE: we don't have any submodules currently, they are best avoided.
init-modules:
	git submodule update --init --recursive
.PHONY: init-modules

# Install packages as specified in the pnpm-lockfile.yaml.
install-frozen:
	pnpm install --frozen-lockfile
.PHONY: install-deps

# ==================================================================================================
# DEPENDENCY MANAGEMENT
#   Update dependencies, check for outdated dependencies, etc.

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

node_modules: package.json packages/*/package.json
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

clean:
	make remove-modules
	rm -rf packages/docs/docs/pages/{js,react}/api
	rm -rf packages/{sdk-react,sdk-vanillajs,iframe,demo-vanillajs,demo-react,docs/docs}/dist
	rm -rf packages/docs/vocs.config.ts.timestamp-*
.PHONY: clean

# In case you accidentally pollute the node_modules directories
# (e.g. by running npm instead of pnpm)
reset-modules:
	make remove-modules
	pnpm install --frozen-lockfile
.PHONY: reset-modules

# ==================================================================================================
# Extras

# install this to run github workflows locally
# https://nektosact.com/
debug-github-workflow:
	act push
.PHONY: debug-github-workflow

# Enable Git Hooks
enable-hooks:
	@./node_modules/.bin/husky
.PHONY: enable-hooks

# Disable Git Hooks
disable-hooks:
	git config --unset core.hooksPath
.PHONY: disable-hooks
