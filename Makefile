SHELL := /bin/bash
# Packages
SUPPORT_PKGS := configs,contracts,common,sdk-shared,sdk-firebase-web3auth-strategy
SDK_PKGS := sdk-vanillajs,sdk-react,iframe
DEMO_PKGS := demo-vanillajs,demo-react,docs

# Currently Active Branch
YOUR_BRANCH = $(git rev-parse --abbrev-ref HEAD)
# Lead branch
DEFAULT_BRANCH = master


# ==================================================================================================
# BASICS COMMANDS
#   To get the project running locally.

# To be run when first setting up the repository.
setup: install-frozen
	make enable-hooks
	cd packages/contracts && make setup
.PHONY: setup

# Runs anvil (local EVM node).
anvil:
	cd packages/contracts && make anvil
.PHONY: anvil

iframe-dev:
	cd packages/iframe && make dev
.PHONY: iframe-dev

demo-react-dev:
	cd packages/demo-react && make dev
.PHONY: demo-react-dev

demo-vanilla-dev:
	cd packages/demo-vanillajs && make dev
.PHONY: demo-vanilla-dev

sdk-react-dev:
	cd packages/sdk-react && make dev
.PHONY: sdk-react

sdk-dev:
	make -j 2 iframe-dev sdk-react-dev
.PHONY: sdk-dev

# Builds the sdks, apps, contracts & demos
build:	
	for name in packages/{$(SUPPORT_PKGS)}; do\
		echo "Building $${name}";\
		cd $${name} && make build && cd ../../ || exit 1;\
	done

	for name in packages/{$(SDK_PKGS)}; do\
		echo "Building $${name}";\
		cd $${name} && make build && cd ../../ || exit 1;\
	done

	for name in packages/{$(DEMO_PKGS)}; do\
		echo "Building $${name}";\
		cd $${name} && make build && cd ../../ || exit 1;\
	done
.PHONY: build

# build latest docs and start server http://localhost:4173
docs:
	cd packages/docs && make build && make preview
.PHONY: docs

# build docs for production
docs.build:
	cd packages/docs && make dev
.PHONY: docs.build

# start docs in watch mode
docs.watch:
	cd packages/docs && make dev
.PHONY: docs.watch

# Deploys to the contracts to the local node (requires anvil to be running).
deploy:
	cd packages/contracts && make deploy
.PHONY: deploy

# Run tests
test:
	cd packages/sdk-vanillajs && make test
.PHONY: test

# Performs code-quality checks.
check:
	for name in packages/{$(SUPPORT_PKGS)}; do\
		echo "Checking $${name}";\
		cd $${name} && make check && cd ../../ || exit 1;\
	done

	for name in packages/{$(SDK_PKGS)}; do\
		echo "Checking $${name}";\
		cd $${name} && make check && cd ../../ || exit 1;\
	done
	for name in packages/{$(DEMO_PKGS)}; do\
		echo "Checking $${name}";\
		cd $${name} && make check && cd ../../ || exit 1;\
	done

	pnpm biome check ./
.PHONY: check

# Performs code formatting for the webapp files and contracts in their respective directories.
format:
	for name in packages/{$(SUPPORT_PKGS)}; do\
		echo "Formatting $${name}";\
		cd $${name} && make format && cd ../../ || exit 1;\
	done

	for name in packages/{$(SDK_PKGS)}; do\
		echo "Formatting $${name}";\
		cd $${name} && make format && cd ../../ || exit 1;\
	done

	for name in packages/{$(DEMO_PKGS)}; do\
		echo "Formatting $${name}";\
		cd $${name} && make format && cd ../../ || exit 1;\
	done

	pnpm biome check ./ --write
.PHONY: format

# runs the full react demo. site available at localhost:5173
demo-react:
	cd packages/sdk-react && make build
	make -j 2 iframe-dev demo-react-dev
.PHONY: demo-react

demo-vanilla:
	cd packages/sdk-vanillajs && make build
	make -j 2 iframe-dev demo-vanilla-dev
.PHONY: demo-vanilla

# quickly format change files between <your branch> and master
# using default global settings
format-fast-diff:
	pnpm biome check $(git diff --name-only $(YOUR_BRANCH) $(git merge-base $(YOUR_BRANCH) $(DEFAULT_BRANCH)))
.PHONY: format-fast-diff

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

# In case you accidentally pollute the node_modules directories
# (e.g. by running npm instead of pnpm)
reset-modules:
	make remove-modules
	pnpm install --frozen-lockfile
.PHONY: reset-modules

# ==================================================================================================

# install this to run github workflows locally
# https://nektosact.com/
debug-github-workflow:
	act push
.PHONY: debug-github-workflow

# Enable Git Hooks
enable-hooks:
	pnpm husky
.PHONY: enable-hooks

# Disable Git Hooks
disable-hooks:
	git config --unset core.hooksPath
.PHONY: disable-hooks
