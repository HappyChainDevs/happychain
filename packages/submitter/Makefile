include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

# Port at which Anvil will be running
export ANVIL_PORT ?= 8545

migrate: ## Runs latest migrations
	@./dist/cli migrate latest
.PHONY: migrate

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi;
	@./dist/cli migrate latest
.PHONY: migrate-fresh

migrate-rollback: ## Rollsback latest migrations
	@./dist/cli migrate down
.PHONY: rollback

routes: ## Display all available routes
	@./dist/cli routes
.PHONY: routes

test: ## Run the submitter tests
	@bun test --preload ./lib/tests/setup-full.ts --bail
.PHONY: test

# We can't use the beforeAll/afterAll hooks in bun during watch mode, as we deploy the contracts
# and start anvil in the beforeAll hook, which re-triggers the watch mode, resulting in an infinite loop.
# here we will instead start anvil if its not running, deploy the contracts, and then run the tests.
test-watch: ## Run the submitter tests in Watch mode
	if lsof -ti :$(ANVIL_PORT); then \
		make deploy-support-contracts;\
		bun test --preload ./lib/tests/setup-minimal.ts --watch;\
	else \
		make start-anvil;\
		make deploy-support-contracts;\
		bun test --preload ./lib/tests/setup-minimal.ts --watch;\
		make kill-anvil;\
	fi
.PHONY: test-watch

start-anvil: ## Start anvil
	@cd ../../ && make anvil > /dev/null 2>&1 &
.PHONY: start-anvil

kill-anvil: ## Kill an existing Anvil process running at $ANVIL_PORT
	@lsof -ti :$(ANVIL_PORT) | xargs kill -9 2>/dev/null || true
.PHONY: kill-anvil

deploy-contracts: ## Deploys the supporting contracts for testing
	@cd ../../contracts && CONFIG=LOCAL make deploy-boop
	@cd ../../contracts && CONFIG=LOCAL make deploy-mocks
.PHONY: deploy-contracts

setup-symlinks::
	@if ! [ -r ./dist/client.es.js ]; then \
  		ln -sf ../lib/client.ts ./dist/client.es.js; \
  		ln -sf ../lib/client.ts ./dist/client.es.d.ts; \
	fi
	@if ! [ -r ./dist/cli ]; then \
  		ln -sf ../bin/cli.ts ./dist/cli; \
	fi
.PHONY: setup-symlinks
