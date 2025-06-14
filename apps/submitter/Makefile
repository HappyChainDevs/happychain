include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

# Port at which Anvil will be running
export ANVIL_PORT ?= 8545
export PROXY_PORT ?= 8546

# Honor AUTOMINE_TESTS by setting the block time to 0.
export ANVIL_BLOCK_TIME ?= $(if $(findstring true,$(AUTOMINE_TESTS)),0,2)

# Note: Stuck tx time set to 1500ms when automining — some tests set interval mining to 1s.
define setup-test-env
	$(eval export CHAIN_ID=31337) \
	$(eval export RPC_URLS=ws://localhost:8546,http://localhost:8546) \
  	$(eval export NODE_ENV=test) \
  	$(eval export DATABASE_URL=tests.sqlite) \
	$(eval export STUCK_TX_WAIT_TIME=$(if $(findstring true,$(AUTOMINE_TESTS)),1500,2500)) \
  	$(eval export EXECUTOR_KEYS=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80) \
  	$(eval export PRIVATE_KEY_ACCOUNT_DEPLOYER=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80) \
  	if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi; \
	./bin/cli.ts migrate latest;
endef

dev: node_modules reset-dev ## Start development server
	@NODE_ENV=development bun --bun --watch lib/index.ts;
.PHONY: dev

prod: build ## Start the local dev server for development
	@NODE_ENV=production bun --bun run build/index.es.js;
.PHONY: prod

migrate: ## Runs latest migrations
	@bun run lib/cli migrate latest
.PHONY: migrate

db-types: ## Generate TS types for DB
	@./bin/cli.ts db-types
.PHONY: db-types

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${DATABASE_URL} ]; then rm ${DATABASE_URL}; fi;
	@./bin/cli.ts migrate latest
.PHONY: migrate-fresh

migrate-rollback: ## Rolls back latest migrations
	@./bin/cli.ts migrate down
.PHONY: rollback

routes: ## Display all available routes
	@./bin/cli.ts routes
.PHONY: routes

latency: ## Benchmark latency
	bun ./bin/benchmarkLatency.ts;
.PHONY: latency

args ?= --bail

define test-run-anvil-shared
	trap 'make kill-anvil' EXIT; \
	trap 'exit' INT TERM HUP; \
	make start-anvil; \
	until cast chain-id; do sleep 1; done; \
	make deploy-contracts --silent; \
	bun test $(args);
endef

define test-shared
	$(call setup-test-env)
	@if lsof -t -iTCP:$(ANVIL_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
  		bun test $(args); \
	else \
		$(call test-run-anvil-shared) \
	fi;
endef

define set_automine
	$(eval export AUTOMINE_TESTS=$(1))
endef

test: ## Run the submitter tests — runs Anvil and deploys contracts if not already running. Pass args in $args.
	$(call test-shared)
.PHONY: test

test.fast:
	$(call set_automine,true)
	$(call test-shared)
.PHONY: test.fast

test.slow: ## Runs the tests with a 2s block interval
	$(call set_automine,false)
	$(call test-shared)
.PHONY: test.slow

test-run-anvil:
	$(call setup-test-env)
	@$(call test-run-anvil-shared)
.PHONY: test-run-anvil

test.watch: ## Run the submitter tests in watch mode
	@make test args=--watch;
.PHONY: test.watch

# Start anvil
start-anvil:
	@cd ../../contracts && make anvil-background
.PHONY: start-anvil

# Kill an existing Anvil process running at $ANVIL_PORT
kill-anvil:
	@cd ../../contracts && make kill-anvil
.PHONY: kill-anvil

# Deploys the supporting contracts for testing
deploy-contracts:
	@cd ../../contracts && CONFIG=LOCAL make deploy-boop
	@cd ../../contracts && CONFIG=LOCAL make deploy-mocks
.PHONY: deploy-contracts

setup-symlinks::
	@if ! [ -r ./dist/client.es.js ]; then \
  		ln -sf ../lib/client.ts ./dist/client.es.js; \
  		ln -sf ../lib/client.ts ./dist/client.es.d.ts; \
	fi
.PHONY: setup-symlinks
