# Make entire file 'silent' (unless make VERBOSE=1)
ifndef VERBOSE
	MAKEFLAGS += --silent
endif

include makefiles/lib.mk
include makefiles/help.mk

# ==================================================================================================
# Packages

# packages shared between SDK & iframe (order matters)
SHARED_PKGS := support/common,support/wallet-common,support/worker

# packages only used in the SDK
SDK_ONLY_PKGS := packages/core,packages/react,packages/vue

# packages needed to build the sdk
SDK_PKGS := $(SHARED_PKGS),$(SDK_ONLY_PKGS)

# packages needed to build the iframe
IFRAME_PKGS := $(SHARED_PKGS),apps/iframe

# packages needed to build the sdk and iframe
ACCOUNT_PKGS := $(SHARED_PKGS),$(SDK_ONLY_PKGS),apps/iframe

# demo packages (not including dependencies)
DEMOS_PKGS := demos/js,demos/react,demos/vue

# packages only used in the backend services (order matters)
BACKEND_ONLY_PKGS := packages/txm,apps/randomness

# packages needed to build the backend services (order matters)
BACKEND_PKGS := support/common,$(BACKEND_ONLY_PKGS)

# design system packages
DESIGN_SYSTEM_PKGS := support/design-tokens,packages/design-system,packages/uikit-react

# all typescript packages, excluding docs
TS_PKGS := $(ACCOUNT_PKGS),$(DEMOS_PKGS),${BACKEND_PKGS},${DESIGN_SYSTEM_PKGS}

# all packages that have a package.json
NPM_PKGS := $(TS_PKGS),apps/docs,contracts,support/configs

# ==================================================================================================
# CMDS

# Concurrently or mprocs to run commands in parallel
MULTIRUN ?= concurrently

# ==================================================================================================
# HELPERS

# Validation function for Ethereum addresses (0x followed by 40 hex chars)
check_eth_address = $(shell echo $(1) | grep -E '^0x[a-fA-F0-9]{40}$$' > /dev/null && echo 1 || echo 0)

# ==================================================================================================
# FORALL

define forall
	$(eval PKGS := $(strip $(1)))
	$(eval CMD := $(2))
	for name in ./{$(PKGS)}; do\
		echo "Running $(CMD) in $${name}";\
		cd $${name} && $(CMD) && cd ../.. || (cd ../.. && exit 1);\
	done
endef

define forall_make
	$(eval PKGS := $(strip $(1)))
	$(eval TARGET := $(2))
	for name in ./{$(PKGS)}; do\
		echo "Running make $(TARGET) in $${name}";\
		make $(TARGET) --directory=$${name} || exit 1;\
	done
endef

define with_optional_iframe
	$(eval DEMO_NAME := $(strip $(1)))
	$(eval DEMO_PATH := $(strip $(2)))
	$(eval DEMO_CMD := $(strip $(3)))

	@if lsof -t -i :5160 &> /dev/null; then \
		$(MULTIRUN) --names $(DEMO_NAME) "cd $(DEMO_PATH) && make $(DEMO_CMD)";\
	else \
		$(MULTIRUN) --names "iframe,$(DEMO_NAME)" "cd apps/iframe && make $(DEMO_CMD)" "cd $(DEMO_PATH) && make $(DEMO_CMD)";\
	fi
endef

# ==================================================================================================
# BASICS COMMANDS
#   To get the project running locally.

setup: install-frozen enable-hooks ## To be run when first setting up the repository.
	$(call forall_make , $(NPM_PKGS) , setup)
	@echo "Running make setup in ./packages/bundler"
	@cd packages/bundler && make setup
	@echo "Running make setup in ./contracts"
	@cd contracts && make setup
.PHONY: setup

# Internal, to avoid cloning / rebuilding alto.
setup.ts:
	$(call forall_make , $(TS_PKGS) , setup)
.PHONY: setup.ts

clean: ts.clean docs.clean contracts.clean ## Removes build artifacts
.PHONY: clean

build: node_modules ts.build  ## Creates production builds
.PHONY: build

nuke: clean ## Removes build artifacts and dependencies 
	cd contracts && make nuke
	cd packages/bundler && make nuke
	$(MAKE) remove-modules
.PHONY: nuke

# Only cleans & removes node_modules (doesn't touch the bundler or contracts)
nuke.ts: clean
	$(MAKE) remove-modules
.PHONY: nuke

test: sdk.test iframe.test ## Run tests
.PHONY: test

docs: node_modules docs.contained ## Builds latest docs and starts dev server http://localhost:4000
	cd apps/docs && make preview
.PHONY: docs

# ==================================================================================================
##@ Formatting
# cf. makefiles/formatting.mk

check: node_modules ts.check contracts.check ## Runs code quality & formatting checks
	biome check ./;
.PHONY: check

format: ts.format contracts.format ## Formats code and tries to fix code quality issues
	biome check ./ --write;
.PHONY: format

# ==================================================================================================
##@ Demos & Apps

iframe.dev: shared.dev sdk.dev ## Serves the wallet iframe at http://localhost:5160
	cd apps/iframe && make dev
.PHONY: iframe.dev


demo-js.dev: setup.ts shared.dev sdk.dev ## Serves the VanillaJS demo application at http://localhost:6001
	$(call with_optional_iframe, "demo-js", "demos/js", "dev")
.PHONY: demo-js.dev

demo-react.dev: setup.ts shared.dev sdk.dev ## Serves the React demo application at http://localhost:6002
	$(call with_optional_iframe, "demo-react", "demos/react", "dev")
.PHONY: demo-react.dev

demo-vue.dev: setup.ts shared.dev sdk.dev ## Serves the VueJS demo application at http://localhost:6003
	$(call with_optional_iframe, "demo-vue", "demos/vue", "dev")
.PHONY: demo-vue.dev

demo-js.prod: setup.ts  ## Builds & runs the prod version of the JS demo at http://localhost:6001
	make demo-js.build;
	$(call with_optional_iframe, "demo-js", "demos/js", "preview")
.PHONY: demo-js.prod

demo-react.prod: setup.ts ## Builds & runs the prod version of the React demo at http://localhost:6002
	make demo-react.build;
	$(call with_optional_iframe, "demo-react", "demos/react", "preview")
.PHONY: demo-react.prod

demo-vue.prod: setup.ts sdk.build  ## Builds & runs the prod version of the Vue demo at http://localhost:6003
	make demo-vue.build;
	$(call with_optional_iframe, "demo-vue", "demos/vue", "preview")
.PHONY: demo-vue.prod

# ==================================================================================================
##@ Contracts

anvil: ## Runs anvil (local EVM node)
	cd contracts && make anvil
.PHONY: anvil

deploy: ## Deploys contracts to Anvil
	cd contracts && make deploy
.PHONY: deploy

# ==================================================================================================
# DEVELOPMENT

shared.dev:
	$(call forall_make , $(SHARED_PKGS) , dev)
.PHONY: shared.dev

sdk.dev:
	$(call forall_make , $(SDK_ONLY_PKGS) , dev)
.PHONY: sdk-dev

# start docs in watch mode (can crash, see packages/docs/Makefile for more info)
docs.dev: setup.ts shared.dev sdk.dev
	cd apps/docs && make dev
.PHONY: docs.dev

# ==================================================================================================
# CORRECTNESS

sdk.test:
	$(call forall_make , $(SDK_PKGS) , test)
.PHONY: sdk.test

sdk.check:
	$(call forall_make , $(SDK_PKGS) , check)
.PHONY: sdk.check

iframe.test:
	$(call forall_make , $(IFRAME_PKGS) , test)
.PHONY: iframe.test

# ==================================================================================================
# FORMATTING

iframe.check:
	$(call forall_make , $(IFRAME_PKGS) , check)
.PHONY: iframe.check

account.check:
	$(call forall_make , $(ACCOUNT_PKGS) , check)
.PHONY: account.check

demos.check:
	$(call forall_make , $(DEMOS_PKGS) , check)
.PHONY: apps.check

docs.check:
	echo "Running make check in apps/docs"
	cd apps/docs && make check
.PHONY: docs.check

backend.check:
	$(call forall_make , $(BACKEND_PKGS) , check)
.PHONY: backend.check

ts.check:
	echo $(TS_PKGS)
	$(call forall_make , $(TS_PKGS) , check)
.PHONY: ts.check

contracts.check:
	echo "Running make check in contracts"
	cd contracts && make check
.PHONY: contracts.check

sdk.format:
	$(call forall_make , $(SDK_PKGS) , format)
.PHONY: sdk.format

iframe.format:
	$(call forall_make , $(IFRAME_PKGS) , format)
.PHONY: iframe.format

account.format:
	$(call forall_make , $(ACCOUNT_PKGS) , format)
.PHONY: account.format

demos.format:
	$(call forall_make , $(DEMOS_PKGS) , format)
.PHONY: apps.format

docs.format:
	cd apps/docs && make format
.PHONY: docs.format

backend.format:
	$(call forall_make , $(BACKEND_PKGS) , format)
.PHONY: backend.format

ts.format:
	$(call forall_make , $(TS_PKGS) , format)
.PHONY: ts.format

contracts.format:
	cd contracts && make format
.PHONY: contracts.format

# ==================================================================================================
# PRODUCTION BUILDS

shared.build:
	$(call forall_make , $(SHARED_PKGS) , build)
.PHONY: shared.build

sdk.build:
	$(call forall_make , $(SDK_PKGS) , build)
.PHONY: sdk.build

iframe.build:
	$(call forall_make , $(IFRAME_PKGS) , build)
.PHONY: iframe.build

account.build:
	make sdk.build
	make iframe.build
.PHONY: account.build

demo-js.build: setup.ts shared.build
	cd packages/core && make build
	cd demos/js && make build
.PHONY: demo-js.build

demo-react.build: setup.ts shared.build
	cd packages/core && make build
	cd packages/react && make build
	cd demos/react && make build
.PHONY: demo-react.build

demo-vue.build: setup.ts shared.build
	cd packages/core && make build
	cd demos/vue && make build
.PHONY: demo-vue.build

demos.build:
	$(call forall_make , $(DEMOS_PKGS) , build)
.PHONY: apps.build

backend.build:
	$(call forall_make , $(BACKEND_PKGS) , build)
.PHONY: backend.build

ts.build:
	$(call forall_make , $(TS_PKGS) , build)
.PHONY: ts.build

contracts.build:
	cd contracts && make build
.PHONY: contracts.build

randomness.build: setup.ts shared.build
	cd packages/txm && make build
	cd apps/randomness && make build
.PHONY: randomness.build

txm.build: setup.ts shared.build
	cd packages/txm && make build
.PHONY: txm.build

# ==================================================================================================
##@ Docs

docs.build: ## Build the docs
	cd apps/docs && make build
.PHONY: docs.build

# Fully self-contained target to build docs, to be used by docs page host.
docs.contained: setup.ts shared.dev sdk.dev docs.build
.PHONY: docs.contained

docs.preview: ## Serve already-built docs
	cd apps/docs && make preview
.PHONY: docs.preview

# ==================================================================================================
# CLEANING

sdk.clean:
	$(call forall_make , $(SDK_PKGS) , clean)
.PHONY: sdk.clean

iframe.clean:
	$(call forall_make , $(IFRAME_PKGS) , clean)
.PHONY: iframe.clean

account.clean:
	$(call forall_make , $(ACCOUNT_PKGS) , clean)
.PHONY: account.clean

demos.clean:
	$(call forall_make , $(DEMOS_PKGS) , clean)
.PHONY: apps.clean

docs.clean:
	@echo "Running make clean in ./apps/docs"
	@cd apps/docs && make clean
.PHONY: docs.clean

backend.clean:
	$(call forall_make , $(BACKEND_PKGS) , clean)
.PHONY: backend.clean

ts.clean:
	$(call forall_make , $(TS_PKGS) , clean)
.PHONY: ts.clean

contracts.clean:
	@echo "Running make clean in ./contracts"
	@cd contracts && make clean
.PHONY: contracts.clean

# ==================================================================================================
# DEPENDENCY MANAGEMENT
#   Update dependencies, check for outdated dependencies, etc.

# Install packages as specified in bun.lock.
install-frozen:
	# --frozen-lockfile will not generate the lockfile if missing
	@if [ -r bun.lock ]; then \
		bun install --frozen-lockfile; \
	else \
		bun install; \
	fi
.PHONY: install-frozen

# NOTES:
#  Below "version specifier" refers to the version strings (e.g. "^1.2.3") in package.json.
#  You can safely use bun commands inside the packages, and things will behave like you expect
#  (i.e. update only the package, but use the bun monorepo architecture).

# Like npm install: if a version matching version specifier is installed, does nothing, otherwise
# installs the most up-to-date version matching the specifier.
install:
	@bun install
.PHONY: install

node_modules: package.json $(wildcard {apps,demos,packages,support}/*/package.json)
	@bun install

# Shows packages for which new versions are available (compared to the installed version).
# This will also show new versions that do not match the version specifiers!
outdated:
	@bun outdated
	$(call forall , $(NPM_PKGS) , bun outdated)
.PHONY: outdated

# Updates all packages to their latest version that match the version specifier.
# It will also update the version specifiers to point to the new version.
# You can also run this if your installed versions are > than the version specifiers and you want
# to update them.
update:
	bun update
.PHONY: update

# Updates all packages to their latest version (even if they do not match the version specifier!).
# It will also update the version specifiers to point to the new version.
update-latest:
	bun update --latest
	@echo "If the lockfileVersion changed, please update 'packageManager' in package.json!"
.PHONY: update-latest

remove-modules:
	@echo "Removing all node_modules"
	rm -rf node_modules apps/*/node_modules demos/*/node_modules packages/*/node_modules support/*/node_modules

	@echo "Removing all dist/*"
	rm -rf apps/*/dist demos/*/dist packages/*/dist support/*/dist
.PHONY: remove-modules

# ==================================================================================================
##@ Publishing

changeset: ## Add a new changeset
	changeset add;
.PHONY: changeset

version: ## Bump all package dependencies according to staged changesets & generate changelogs
	changeset version
.PHONY: version

publish: build test  ## Build, test, then publish current packages
	$(call forall_make , $(SDK_ONLY_PKGS) , publish)
	changeset tag # push with `git push --follow-tags`
.PHONY: publish

# ==================================================================================================
# EXTRAS

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