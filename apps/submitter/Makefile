include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

# Port at which Anvil will be running
export ANVIL_PORT ?= 8545

# Honor AUTOMINE_TESTS by setting the block time to 0.
export ANVIL_BLOCK_TIME ?= $(if $(findstring true,$(AUTOMINE_TESTS)),0,2)

define setup-test-env
	$(eval export CHAIN_ID=31337) \
	$(eval export RPC_URL=http://localhost:8545) \
  	$(eval export NODE_ENV=test) \
  	$(eval export SUBMITTER_DB_PATH=tests.sqlite) \
  	$(eval export EXECUTOR_KEYS=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80) \
  	$(eval export PRIVATE_KEY_ACCOUNT_DEPLOYER=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80) \
  	if [ -f ${SUBMITTER_DB_PATH} ]; then rm ${SUBMITTER_DB_PATH}; fi; \
	./dist/cli migrate latest;
endef

dev: node_modules reset-dev
	@NODE_ENV=development bun --bun --watch lib/index.ts;
.PHONY: dev

prod: build ## Start the local dev server for development
	@NODE_ENV=production bun --bun run build/index.es.js;
.PHONY: prod

migrate: ## Runs latest migrations
	@./dist/cli migrate latest
.PHONY: migrate

db-types: ## Generate TS types for DB
	@./dist/cli db-types
.PHONY: db-types

migrate-fresh: ## Deletes database and starts fresh
	@if [ -f ${SUBMITTER_DB_PATH} ]; then rm ${SUBMITTER_DB_PATH}; fi;
	@./dist/cli migrate latest
.PHONY: migrate-fresh

migrate-rollback: ## Rollsback latest migrations
	@./dist/cli migrate down
.PHONY: rollback

routes: ## Display all available routes
	@./dist/cli routes
.PHONY: routes

latency: ## Benchmark latency
	bun ./bin/benchmarkLatency.ts;
.PHONY: latency

args ?= --bail

test: ## Run the submitter tests — runs Anvil and deploys contracts if not already running. Pass args in $args.
	@if lsof -ti :$(ANVIL_PORT) > /dev/null 2>&1; then \
  		$(call setup-test-env) \
  		bun test $(args); \
	else \
		make test-run-anvil; \
	fi;
.PHONY: test

test-run-anvil:
	@trap 'make kill-anvil' EXIT; \
	trap 'exit' INT TERM HUP; \
	$(call setup-test-env) \
	make start-anvil; \
	until cast chain-id; do sleep 1; done; \
	make deploy-contracts --silent; \
	bun test $(args);
.PHONY: test-run-anvil

test.watch: ## Run the submitter tests in Watch mode
	@make test args=--watch;
.PHONY: test.watch

start-anvil: ## Start anvil
	@cd ../../contracts && make anvil-background
.PHONY: start-anvil

kill-anvil: ## Kill an existing Anvil process running at $ANVIL_PORT
	@cd ../../contracts && make kill-anvil
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
