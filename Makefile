# Make entire file 'silent' (unless make VERBOSE=1)
ifndef VERBOSE
	MAKEFLAGS += --silent
endif

include makefiles/lib.mk


# ==================================================================================================
# Packages

# packages shared between SDK & iframe (order matters)
SHARED_PKGS := common,sdk-shared

# packages only used in the SDK
SDK_ONLY_PKGS := sdk-vanillajs,sdk-react,sdk-ui,vite-plugin-shared-worker

# packages only used in the iframe (order matters)
IFRAME_ONLY_PKGS := sdk-firebase-web3auth-strategy,iframe

# packages needed to build the sdk
SDK_PKGS := $(SHARED_PKGS),$(SDK_ONLY_PKGS)

# packages needed to build the iframe
IFRAME_PKGS := $(SHARED_PKGS),$(IFRAME_ONLY_PKGS)

# packages needed to build the sdk and iframe
ACCOUNT_PKGS := $(SHARED_PKGS),$(SDK_ONLY_PKGS),$(IFRAME_ONLY_PKGS)

# demo packages (not including dependencies)
DEMOS_PKGS := demo-vanillajs,demo-react,demo-wagmi-vue

# backend packages (order matters)
BACKEND_PKGS := transaction-manager,randomness-service

# all typescript packages, excluding docs
TS_PKGS := $(ACCOUNT_PKGS),$(DEMOS_PKGS),${BACKEND_PKGS}

# all packages (have a package.json)
ALL_PKGS := $(TS_PKGS),docs,contracts,configs

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


check: node_modules ts.check contracts.check ## Runs code quality & formatting checks
	@# cf. makefiles/formatting.mk
	biome check ./;
.PHONY: check

format: ts.format contracts.format ## Formats code and tries to fix code quality issues
	biome check ./ --write;
.PHONY: format

test: sdk.test iframe.test ## Run tests
.PHONY: test

nuke: remove-modules clean ## Removes build artifacts and dependencies
	cd packages/contracts && make nuke
	cd packages/bundler && make nuke
.PHONY: nuke

docs: node_modules docs.contained ## Builds latest docs and starts dev server http://localhost:4173
	cd packages/docs && make preview
.PHONY: docs

iframe.dev: shared.dev sdk.dev ## Serves the wallet iframe at http://localhost:5160
	cd packages/iframe && make dev
.PHONY: iframe.dev

demo-js.dev: setup shared.dev sdk.dev ## Serves the VanillaJS demo application as http://localhost:5173
	$(MULTIRUN) --names "iframe,demo-js" "cd packages/iframe && make dev" "cd packages/demo-vanillajs && make dev"
.PHONY: demo-js.dev

demo-react.dev: setup shared.dev sdk.dev ## Serves the React demo application as http://localhost:5173
	$(MULTIRUN) --names "iframe,demo-react" "cd packages/iframe && make dev" "cd packages/demo-react && make dev"
.PHONY: demo-react.dev

demo-vue.dev: setup shared.dev sdk.dev ## Serves the VueJS demo application as http://localhost:5173
	$(MULTIRUN) --names "iframe,demo-vue" "cd packages/iframe && make dev" "cd packages/demo-wagmi-vue && make dev"
.PHONY: demo-vue.dev

# ==================================================================================================
# DEVELOPMENT

shared.dev:
	cd packages/common && make build
	cd packages/sdk-shared && make build
	cd packages/vite-plugin-shared-worker && make build
.PHONY: shared.dev

sdk.dev:
	cd packages/sdk-ui && make dev
	cd packages/sdk-vanillajs && make dev
	cd packages/sdk-react && make dev
.PHONY: sdk-dev

# start docs in watch mode (can crash, see packages/docs/Makefile for more info)
docs.dev: shared.dev sdk.dev
	cd packages/docs && make dev
.PHONY: docs.watch

# ==================================================================================================
# FORALL

define forall
	$(eval PKGS := $(strip $(1)))
	$(eval CMD := $(2))
	for name in packages/{$(PKGS)}; do\
		echo "Running $(CMD) in $${name}";\
		cd $${name} && $(CMD) && cd ../.. || (cd ../.. && exit 1);\
	done
endef

define forall_make
	$(eval PKGS := $(strip $(1)))
	$(eval TARGET := $(2))
	for name in packages/{$(PKGS)}; do\
		echo "Running make $(TARGET) in $${name}";\
		make $(TARGET) --directory=$${name} || exit 1;\
	done
endef

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
	echo "Running make check in packages/docs"
	cd packages/docs && make check
.PHONY: docs.check

ts.check:
	echo $(TS_PKGS)
	$(call forall_make , $(TS_PKGS) , check)
.PHONY: ts.check

contracts.check:
	echo "Running make check in packages/contracts"
	cd packages/contracts && make check
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
	cd packages/docs && make format
.PHONY: docs.format

ts.format:
	$(call forall_make , $(TS_PKGS) , format)
.PHONY: ts.format

contracts.format:
	cd packages/contracts && make format
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

demos.build:
	$(call forall_make , $(DEMOS_PKGS) , build)
.PHONY: apps.build

ts.build:
	$(call forall_make , $(TS_PKGS) , build)
.PHONY: ts.build

contracts.build:
	cd packages/contracts && make build
.PHONY: contracts.build

# ==================================================================================================
# DOCS

# Fully self-contained target to build docs, to be used by docs page host.
docs.contained: setup shared.build sdk.dev
	cd packages/docs && make build
.PHONY: docs.contained

# Serve already-built docs
docs.preview: docs.contained
	cd packages/docs && make preview
.PHONY: docs.preview

# ==================================================================================================
# CLEANING

clean: ts.clean contracts.clean
.PHONY: clean

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
	cd packages/docs && make clean
.PHONY: docs.clean

ts.clean:
	$(call forall_make , $(TS_PKGS) , clean)
	echo "Running make clean in packages/docs"
	cd packages/docs && make clean
.PHONY: ts.clean

contracts.clean:
	cd packages/contracts && make clean
.PHONY: contracts.clean

# ==================================================================================================
# DEPENDENCY MANAGEMENT
#   Update dependencies, check for outdated dependencies, etc.

# Install packages as specified in the bun.lockb.
install-frozen:
	bun install --frozen-lockfile
.PHONY: install-deps

# NOTES:
#  Below "version specifier" refers to the version strings (e.g. "^1.2.3") in package.json.
#  You can safely use bun commands inside the packages, and things will behave like your expect
#  (i.e. update only the package, but use the bun monorepo architecture).

# Like npm install: if a version matching version specifier is installed, does nothing, otherwise
# install the most up-to-date version matching the specifier.
install:
	@bun install
.PHONY: install

node_modules: package.json $(wildcard packages/*/package.json)
	@bun install

# Shows packages for which new versions are available (compared to the installed version).
# This will also show new version that do not match the version specifiers!
outdated:
	@bun outdated
	$(call forall , $(ALL_PKGS) , bun outdated)
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
