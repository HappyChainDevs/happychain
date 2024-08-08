# ==================================================================================================
# BASICS COMMANDS
#   To get the project running locally.

# To be run when first setting up the repository.
setup: install-frozen
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
	for name in packages/sdk-{react,vanillajs}; do\
        cd $${name} && make build && cd ../../;\
    done

	for name in packages/{contracts,iframe}; do\
        cd $${name} && make build && cd ../../;\
    done

	for name in packages/demo-{react,vanillajs}; do\
        cd $${name} && make build && cd ../../;\
    done
.PHONY: build

# Deploys to the contracts to the local node (requires anvil to be running).
deploy:
	cd packages/contracts && make deploy
.PHONY: deploy

# Run tests
test:
	cd packages/sdk-core && make test
	cd packages/sdk-react && make test
.PHONY: test

# Performs code-quality checks.
check:
	cd packages/common && make check
	cd packages/contracts && make check
	cd packages/demo-react && make check
	cd packages/demo-vanillajs && make check
	cd packages/iframe && make check
	cd packages/sdk-core && make check
	cd packages/sdk-firebase-web3auth-strategy && make check
	cd packages/sdk-react && make check
	cd packages/sdk-vanillajs && make check
.PHONY: check

# Performs code formatting for the webapp files and contracts in their respective directories.
format:
	cd packages/common && make format
	cd packages/contracts && make format
	cd packages/demo-react && make format
	cd packages/demo-vanillajs && make format
	cd packages/iframe && make format
	cd packages/sdk-core && make format
	cd packages/sdk-firebase-web3auth-strategy && make format
	cd packages/sdk-react && make format
	cd packages/sdk-vanillajs && make format
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

# quick check using biome
# Not a perfect 1:1 of eslint/prettier, but very close and much faster
check-fast:
	bunx @biomejs/biome check ./
.PHONT: check-fast

# quick format using biome
# Not a perfect 1:1 of eslint/prettier, but very close and much faster
format-fast:
	bunx @biomejs/biome check ./ --write
.PHONT: format-fast

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

# In case you accidentally pollute the node_modules directories
# (e.g. by running npm instead of pnpm)
reset-modules:
	rm -rf node_modules packages/*/node_modules
	pnpm install --frozen-lockfile
.PHONY: reset-modules

# ==================================================================================================
