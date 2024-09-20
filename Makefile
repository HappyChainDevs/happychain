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

# packages shared between SDK & iframe
SHARED_PKGS := sdk-shared,common

# packages only used in the SDK
SDK_ONLY_PKGS := sdk-vanillajs,sdk-react,sdk-frontend-components

# packages only used in the iframe
IFRAME_ONLY_PKGS := iframe,sdk-firebase-web3auth-strategy

# packages needed to build the sdk
SDK_PKGS := $(SHARED_PKGS),$(SDK_ONLY_PKGS)

# packages needed to build the iframe
IFRAME_PKGS := $(SHARED_PKGS),$(IFRAME_ONLY_PKGS)

# demo packages (not including dependencies)
DEMOS_PKGS := demo-vanillajs,demo-react,demo-wagmi-vue

# all typescript packages
TS_PKGS := $(SDK_ONLY_PKGS),$(IFRAME_ONLY_PKGS),$(DEMOS_PKGS),docs

# ==================================================================================================
# CMDS

# Concurrently or mprocs to run commands in parallel
MULTIRUN ?= concurrently

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

build: node_modules ts.build  ## Creates production builds
.PHONY: build

docs: node_modules docs.contained ## Builds latest docs and starts dev server http://localhost:4173
	cd packages/docs && make preview
.PHONY: docs

check: node_modules ts.check contracts.check ## Runs code quality & formatting checks
	@# cf. makefiles/formatting.mk
	biome check ./;
.PHONY: check

format: ts.format contracts.format ## Formats code and tries to fix code quality issues
	biome check ./ --write;
.PHONY: format

test: sdk.test iframe.test ## Run tests
.PHONY: test

clean: ts.clean contracts.clean ## Removes build artifacts
.PHONY: clean

nuke: remove-modules clean ## Removes build artifacts and dependencies
.PHONY: nuke

# ==================================================================================================
# DEVELOPMENT

define sdk-dev-commands
	"cd packages/sdk-vanillajs && make build.watch" \
	"cd packages/sdk-react && make build.watch"
endef

iframe-dev-command := cd packages/iframe && make dev

define account-dev-commands
	$(sdk-dev-commands) \
	"$(iframe-dev-command)"
endef

sdk.dev:
	$(MULTIRUN) --names "js,react" $(sdk-dev-commands)
.PHONY: sdk-dev

iframe.dev:
	$(iframe-dev-command)
.PHONY: iframe.dev

account.dev:
	$(MULTIRUN) --names "js,react,iframe" $(account-dev-commands)
.PHONY: account.dev

demo-js.dev:
	$(MULTIRUN) --names "js,react,iframe,demo-js" $(account-dev-commands) \
		"cd packages/demo-vanillajs && make dev"
.PHONY: demo-vanillajs.dev

demo-react.dev:
	$(MULTIRUN) --names "js,react,iframe,demo-react" $(account-dev-commands) \
		"cd packages/demo-react && make dev"
.PHONY: demo-react.dev

demo-vue.dev:
	$(MULTIRUN) --names "js,react,iframe,demo-vue" $(account-dev-commands) \
		"cd packages/demo-wagmi-vue && make dev"
.PHONY: demo-wagmi-vue.dev

# start docs in watch mode (can crash, see packages/docs/Makefile for more info)
docs.dev:
	cd packages/docs && make dev
.PHONY: docs.watch

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
	$(call forall , $(SDK_PKGS) , test)
.PHONY: sdk.test

sdk.check:
	$(call forall , $(SDK_PKGS) , check)
.PHONY: sdk.check

iframe.test:
	$(call forall , $(IFRAME_PKGS) , test)
.PHONY: iframe.test

iframe.check:
	$(call forall , $(IFRAME_PKGS) , check)
.PHONY: iframe.check

demos.check:
	$(call forall , $(DEMOS_PKGS) , check)
.PHONY: apps.check

docs.check:
	echo "Running make check in packages/docs"
	cd packages/docs && make check
.PHONY: docs.check

ts.check:
	echo $(TS_PKGS)
	$(call forall , $(TS_PKGS) , check)
.PHONY: ts.check

contracts.check:
	echo "Running make check in packages/contracts"
	cd packages/contracts && make check
.PHONY: contracts.check

sdk.format:
	$(call forall , $(SDK_PKGS) , format)
.PHONY: sdk.format

iframe.format:
	$(call forall , $(IFRAME_PKGS) , format)
.PHONY: iframe.format

demos.format:
	$(call forall , $(DEMOS_PKGS) , format)
.PHONY: apps.format

docs.format:
	cd packages/docs && make format
.PHONY: docs.format

ts.format:
	$(call forall , $(TS_PKGS) , format)
.PHONY: ts.format

contracts.format:
	cd packages/contracts && make format
.PHONY: contracts.format

# ==================================================================================================
# PRODUCTION BUILDS

sdk.build:
	$(call forall , $(SDK_PKGS) , build)
.PHONY: sdk.build

iframe.build:
	$(call forall , $(IFRAME_PKGS) , build)
.PHONY: iframe.build

demos.build:
	$(call forall , $(DEMOS_PKGS) , build)
.PHONY: apps.build

ts.build:
	$(call forall , $(TS_PKGS) , build)
.PHONY: ts.build

contracts.build:
	cd packages/contracts && make build
.PHONY: contracts.build

# ==================================================================================================
# DOCS

# Fully self-contained target to build docs, to be used by docs page host.
docs.contained: setup sdk.build
	cd packages/docs && make build
.PHONY: docs.contained

# Serve already-built docs
docs.preview:
	cd packages/docs && make preview
.PHONY: docs.preview

# ==================================================================================================
# CLEANING

sdk.clean:
	$(call forall , $(SDK_PKGS) , clean)
.PHONY: sdk.clean

iframe.clean:
	$(call forall , $(IFRAME_PKGS) , clean)
.PHONY: iframe.clean

demos.clean:
	$(call forall , $(DEMOS_PKGS) , clean)
.PHONY: apps.clean

docs.clean:
	cd packages/docs && make clean
.PHONY: docs.clean

ts.clean:
	$(call forall , $(TS_PKGS) , clean)
.PHONY: ts.clean

contracts.clean:
	cd packages/contracts && make clean
.PHONY: contracts.clean

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
