# Unlock more powerful features than plain POSIX sh.
SHELL := /bin/bash

# add node_modules from one layer up
ADD_PATH = $(eval PATH := $(if $(findstring :$(PATH_TO_ADD):,:$(PATH):),$(PATH),$(1):$(PATH)))
$(call ADD_PATH , ../node_modules/.bin)

include ../makefiles/lib.mk
include ../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

# Set CONFIG to "LOCAL" by default. Other valid values: "TEST" or "MAIN".
# Must be exported as some deploy scripts depend on it.
export CONFIG ?= LOCAL

# Set the list of allowed bundlers based on the current deployment configuration (LOCAL, TEST, etc.)
export ALLOWED_BUNDLERS = $(ALLOWED_BUNDLERS_$(CONFIG))

# Deployment mode:
# - "deploy" — deploy contracts normally
# - "dry" — for a dry-run that doesn't send transactions
# - "resume" — resumes the previous deployment
DEPLOY ?= deploy

# Flags for `ln` (symlink creation)
LN_FLAGS := $(if $(findstring Darwin,$(shell uname)),-shF,-sfT)

# Flag to include or exclude metadata based on configuration
METADATA_FLAG := $(if $(findstring false,$(APPEND_METADATA_$(CONFIG))),--no-metadata,)

# See README.md for more documentation.

# Location of top-level node_modules relative to the contracts package.
# We need the top-level on with Bun, because it leaves the package-specific ones empty.
NODE_MODULES := ../node_modules

# The reason for this weird setup is that the IntelliJ solidity plugin will not resolve imports
# if they're not in `lib` and do not have a `src` directory (the `remappings.txt` file is ignored).
setup:
	if [ ! -f .env ]; then cp .env.example .env; fi
	rm -rf lib
	mkdir -p lib/{openzeppelin,oz-upgradeable}
	ln $(LN_FLAGS) ../$(NODE_MODULES)/ExcessivelySafeCall lib/ExcessivelySafeCall
	ln $(LN_FLAGS) ../$(NODE_MODULES)/solady lib/solady
	ln $(LN_FLAGS) ../$(NODE_MODULES)/kernel lib/kernel
	ln $(LN_FLAGS) ../$(NODE_MODULES)/forge-std lib/forge-std
	ln $(LN_FLAGS) ../$(NODE_MODULES)/@kevincharm/bls-bn254 lib/bls-bn254
	ln $(LN_FLAGS) ../$(NODE_MODULES)/account-abstraction lib/account-abstraction
	ln $(LN_FLAGS) ../../$(NODE_MODULES)/@openzeppelin/contracts lib/openzeppelin/src
	ln $(LN_FLAGS) ../../$(NODE_MODULES)/@openzeppelin/contracts-upgradeable lib/oz-upgradeable/src

.PHONY: setup

####################################################################################################
# Build

build: ## Builds all contracts
	forge build $(METADATA_FLAG)
.PHONY: build

watch: ## Builds contracts & runs tests on contract change
	forge test --watch src/
.PHONY: watch

clean: ## Removes build output
	forge clean
	rm -rf node_modules/.tmp
.PHONY: clean

nuke: clean ## Removes build output and dependencies
	rm -rf lib
.PHONY: nuke

####################################################################################################
# Testing

test: ## Runs tests
	forge test -vv
.PHONY: test

testv: ## Runs test with max verbosity
	forge test -vvvv
.PHONY: testv

test-fork: ## Runs test on a fork of the network (via RPC_$(CONFIG) env variable)
	forge test --gas-report --fork-url $(RPC_$(CONFIG))
.PHONY: test-fork

test-gas: ## Runs test and generate a gas report
	forge test --gas-report
.PHONY: test-gas

test-happyTxLib:
	forge test --match-contract HappyTxLibTest -vvv
.PHONY: test-happyTxLib

test-scrappyAccountFactory:
	forge test --match-contract ScrappyAccountFactoryTest -vvv
.PHONY: test-scrappyAccountFactory

####################################################################################################
# Gas Logging

# Turn gas logging on by uncommenting the measurement statements
gas-logging-on:
	@echo "Turning gas logging ON..."
	@find . -type f -name "*.sol" -exec sed -i '' 's|// \[LOGGAS\]|/* [LOGGAS] */|g' {} +
	@echo "Gas logging is now ON"
.PHONY: gas-logging-on

# Turn gas logging off by commenting out the measurement statements
gas-logging-off:
	@echo "Turning gas logging OFF..."
	@find . -type f -name "*.sol" -exec sed -i '' 's|/\* \[LOGGAS\] \*/|// [LOGGAS]|g' {} +
	@echo "Gas logging is now OFF"
.PHONY: gas-logging-off

####################################################################################################
# Debug Logging

# Turn debug logging on by uncommenting the debug statements
debug-logging-on:
	@echo "Turning debug logging ON..."
	@find . -type f -name "*.sol" -exec sed -i '' 's|// \[LOGDEBUG\]|/* [LOGDEBUG] */|g' {} +
	@echo "Debug logging is now ON"
.PHONY: debug-logging-on

# Turn debug logging off by commenting out the debug statements
debug-logging-off:
	@echo "Turning debug logging OFF..."
	@find . -type f -name "*.sol" -exec sed -i '' 's|/\* \[LOGDEBUG\] \*/|// [LOGDEBUG]|g' {} +
	@echo "Debug logging is now OFF"
.PHONY: debug-logging-off

####################################################################################################
# Demos & Reports

paymaster-gas: ## Generates a gas report for the Paymaster contract.
	forge test -vv --match-contract GasEstimator --rpc-url $(RPC_LOCAL) --isolate | awk '/^Logs:/{p=1; next} p && !/^Suite result:/ && !/^Ran [0-9]+ test suite/' | sed 's/^  //' | sed '/^$$/d' > paymaster_gas_report.txt
.PHONY: gas-paymaster

paymaster-flamechart: ## Generates a flamechart for the gas usage of the Paymaster contract.
	forge test -vv --match-contract GasEstimator --rpc-url $(RPC_LOCAL) --isolate --flamechart
.PHONY: test-aa-gas-flamechart

aa-demo: ## All-in-one run of the AA demo script, including Anvil & contract deployments.
	@lsof -ti :$(ANVIL_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(BUNDLER_PORT) | xargs kill -9 2>/dev/null || true
	@make anvil > /dev/null 2>&1 &
	@sleep 5
	@make deploy-aa CONFIG=LOCAL
	@make deploy-mocks CONFIG=LOCAL
	@cd ../bundler && make build > /dev/null
	@cd ../bundler && make run > /dev/null 2>&1 &
	@sleep 5
	@clear
	@make aa-demo-only
	@lsof -ti :$(ANVIL_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(BUNDLER_PORT) | xargs kill -9 2>/dev/null || true
.PHONY: aa-demo-auto

aa-demo-only: ## Runs the AA demo script only (requires Anvil, and AA & mocks deployments).
	@bun run ./scripts/aa_demo.ts;
.PHONY: aa-demo

bundler-gas: ## All-in-one generation of the gas breakdown for bundler transaction, including Anvil & contract deployments.
	@lsof -ti :$(ANVIL_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(BUNDLER_PORT) | xargs kill -9 2>/dev/null || true
	@make anvil > /dev/null 2>&1 &
	@sleep 5
	@make deploy-aa CONFIG=LOCAL
	@make deploy-mocks CONFIG=LOCAL
	@cd ../bundler && make build > /dev/null
	@cd ../bundler && make run > /dev/null 2>&1 &
	@sleep 5
	@make bundler-gas-only
	@lsof -ti :$(ANVIL_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(BUNDLER_PORT) | xargs kill -9 2>/dev/null || true
.PHONY: gas-bundler-auto

bundler-gas-only: ## Generates a gas report (breakdown) for bundler transactions (requires Anvil & contract deployments).
	@echo "Generating the bundler gas report — this takes a while..."
	@bun run ./scripts/bundler_gas_overhead.ts | awk 'BEGIN {start=0} /Gas Usage for a Single UserOp/ {start=1} {if (start) print}' > bundler_gas_report.txt
.PHONY: gas-bundler

####################################################################################################
# Code Quality

check: lint format-check
	biome check ./;
.PHONY: check

format-check:
	forge fmt --check src
.PHONY: format-check

lint:
	solhint --config ./.solhint.json "src/**/*.sol";
.PHONY: lint

format:
	biome check ./ --write;
	forge fmt src
.PHONY: format

####################################################################################################
# Devnet

# The 1337 chain id matches "localhost" in Wagmi & "Localhost 8545" in MetaMask.
# (Unfortunately some tools will mistakenly report this as not having the Shangai fork activated.)
anvil:
	anvil --chain-id 1337 --block-time 2
.PHONY: anvil

####################################################################################################
# Deployment

VERIFY_FLAG := $(if $(findstring true,$(VERIFY_$(CONFIG))),--verify,)
VERIFIER_FLAG := $(if $(findstring true,$(VERIFY_$(CONFIG))),$(VERIFIER_FLAG_$(CONFIG)),)
VERIFIER_URL := $(if $(findstring true,$(VERIFY_$(CONFIG))),$(VERIFIER_URL_$(CONFIG)),)
CHECK_UPGRADE := true

ifeq ($(DEPLOY),deploy)
	BROADCAST_FLAG := --broadcast
endif

ifeq ($(DEPLOY),dry)
	BROADCAST_FLAG :=
	VERIFY_FLAG :=
endif

ifeq ($(DEPLOY),resume)
	BROADCAST_FLAG := --resume
	CHECK_UPGRADE := false
endif

# Deploys contracts locally, to testnet or mainnet depending on the $CONFIG value.
# You can also specify MODE=dry to not submit the tx, or MODE=resume to resume the last deployment.
deploy:
	$(call run-deploy-script,src/deploy/$(DEPLOY_SCRIPT))
	$(call post-deploy)
	$(call save-deployment)
.PHONY: deploy

# Defines run-deploy-script to use environment variable keys or Foundry accounts depending on the
# value of USE_FOUNDRY_ACCOUNT.
define run-deploy-script
	$(eval __USE_ACC := $(findstring true,$(USE_FOUNDRY_ACCOUNT)))
	$(eval __DEPLOY_FUNC := $(if $(__USE_ACC),run-deploy-script-account,run-deploy-script-key))
	$(call $(__DEPLOY_FUNC),$(1))
endef

# Deploys using a private key supplied in an environment variable (dependent on the $CONFIG value).
define run-deploy-script-key
    @# Command intentionally output.
	forge script $(1) \
		--fork-url $(RPC_$(CONFIG)) \
		--private-key $(PRIVATE_KEY_$(CONFIG)) \
		$(BROADCAST_FLAG) \
		$(VERIFY_FLAG) \
		$(VERIFIER_FLAG) \
		$(VERIFIER_URL) -vvvv
endef

# Deploys using a private key supplied by a Foundry account. The account name and password file
# are supplied in environment variables (dependent on the $CONFIG value).
define run-deploy-script-account
	@$(eval DEPLOY_SENDER := `cast wallet address \
		--account $(ACCOUNT_$(CONFIG)) \
		--password-file $(PASSFILE_$(CONFIG))`)
	@# Command intentionally output.
	forge script $(1) \
		--fork-url $(RPC_$(CONFIG)) \
		--account $(ACCOUNT_$(CONFIG)) \
		--password-file $(PASSFILE_$(CONFIG)) \
		--sender $(DEPLOY_SENDER) \
		$(BROADCAST_FLAG) \
		$(VERIFY_FLAG) \
		$(VERIFIER_FLAG) \
		$(VERIFIER_URL)
endef

# Post-processes the deployment output.
define post-deploy
	@# Print address logs from the deploy script.
	@cat out/deployment.json && printf "\n"

	@# Extract ABIs from the deployed contracts and save to out/abis.json.
	@export CONTRACTS=$$(bun node-jq '[.[]] | unique' out/abiMap.json) && \
	node-jq '[.[]] | unique[]' out/abiMap.json \
		| xargs -L1 -I'{}' forge inspect {} abi \
		| node-jq --slurp --argjson contracts "$$CONTRACTS" '[$$contracts, .] | transpose | map({ (.[0]): .[1] }) | add' \
		> out/abis.json;

	@# Generate "as const" TypeScript ABI definitions for type usage.
	@# To use you will want to symlink this file from the deployments dir to the consuming package,
	@# and .gitignore it.

	@cat scripts/abi_types_fragment_begin.ts.txt > out/abis.ts
	@printf "\n\n" >> out/abis.ts

	@printf "const contractToAbi = (" >> out/abis.ts
	@cat out/abis.json >> out/abis.ts
	@printf ") as const\n\n" >> out/abis.ts

	@printf "const aliasToContract = (" >> out/abis.ts
	@cat out/abiMap.json >> out/abis.ts
	@printf ") as const\n\n" >> out/abis.ts

	@printf "export const deployment = (" >> out/abis.ts
	@cat out/deployment.json >> out/abis.ts
	@printf ") as const\n\n" >> out/abis.ts

	@cat scripts/abi_types_fragment_end.ts.txt >> out/abis.ts
	@printf "\n" >> out/abis.ts
endef

# Explanation of the jq command;
#    CONTRACTS == [ "Contract1", "Contract2", ... ]
#    The command up to xargs sequencially emit the ABI (JSON objects) of each contract.
#	 The jq command in the '--slurp' line starts by creating [CONTRACTS, ArrayOfABIs]
#    It then transposes it: [ ["Contract1", ABI1], ["Contract2", ABI2], ... ]
#    Finally, it maps it to [{ "Contract1": ABI1 } , { "Contract2": ABI2 } , ... ]
#    then joins alls of them in a single JSON dictionary.

# Saves all information pertaining to a deployment to deployments/$DEPLOYMENT_NAME.
# The suggested $DEPLOYMENT_NAME format is "CHAIN/NAME", e.g. "happy-sepolia/aa".
# Will save the latest deployment from $DEPLOY_SCRIPT.
define save-deployment
	@mkdir -p deployments/$(DEPLOYMENT_NAME)
	@cp -f out/deployment.json out/abiMap.json out/abis.json out/abis.ts deployments/$(DEPLOYMENT_NAME)
	$(eval __CHAIN_ID := `cast chain-id --rpc-url $(RPC_$(CONFIG))`)
	@mkdir -p deployments/$(DEPLOYMENT_NAME)
	$(eval __RUN_FILE := broadcast/$(DEPLOY_SCRIPT)/$(__CHAIN_ID)/run-latest.json)
	@if [ "$(CONFIG)" != "LOCAL" ] && [ -f "$(__RUN_FILE)" ]; then \
		cp $(__RUN_FILE) deployments/$(DEPLOYMENT_NAME)/transactions.json; \
	fi
	@echo "Saved deployment to deployments/$(DEPLOYMENT_NAME)"
endef

####################################################################################################
# Deploy Scripts

# Sets CHAIN_ID based on RPC.
define set-chain-id
	CHAIN_ID = $(shell cast chain-id --rpc-url $(RPC_$(CONFIG)))
endef

# Sets CHAIN_NAME based on CHAIN_ID when called.
define set-chain-name
	ifeq ($(CHAIN_ID),1337)
		CHAIN_NAME = anvil
	else ifeq ($(CHAIN_ID),216)
		CHAIN_NAME = happy-sepolia
	else ifeq ($(CHAIN_ID),11155111)
		CHAIN_NAME = sepolia
	else ifeq ($(CHAIN_ID),1)
		CHAIN_NAME = ethereum
	else
		CHAIN_NAME = unknown
	endif
endef

# If DEPLOYMENT_NAME is not set, sets CHAIN_ID and CHAIN_NAME and defines DEPLOYMENT_NAME = CHAIN_NAME/$(1)
# Call like this: $(eval $(call set-deployment-name,myDeployment))
define set-deployment-name
	ifeq ($(DEPLOYMENT_NAME),)
		$(eval $(set-chain-id))
        $(eval $(set-chain-name))
        # Export for use in recursive make invocations.
        export DEPLOYMENT_NAME := $(CHAIN_NAME)/$(1)
	endif
endef

deploy-l1: ## Deploys the non-upgradeable L1 contracts
	$(eval $(call set-deployment-name,l1))
	make deploy DEPLOY_SCRIPT=DeployL1.s.sol
.PHONY: deploy-l1

deploy-l1-upgradeable: ## Deploys the upgradeable L1 contracts (only for reference)
# Performs checks related to contract upgradeability.
# cf. https://docs.openzeppelin.com/upgrades-plugins/1.x/api-core
ifeq ($(CHECK_UPGRADE),true)
	forge clean && forge build $(METADATA_FLAG) # doesn't work with incremental builds
	openzeppelin-upgrades-core validate --contract HappyERC20Upgradeable;
	openzeppelin-upgrades-core validate --contract HappyERC20Upgraded;
endif
	$(eval $(call set-deployment-name,l1-upgradeable))
	make deploy DEPLOY_SCRIPT=DeployL1Upgradeable.s.sol
.PHONY: deploy-l1-upgradeable

deploy-happy-aa: ## Deploys the Happy AA contracts.
	$(eval $(call set-deployment-name,happy-aa))
	make deploy DEPLOY_SCRIPT=DeployHappyAA.s.sol
.PHONY: deploy-happy-aa

deploy-aa: ## Deploys the AA contracts.
	$(eval $(call set-deployment-name,aa))
	make deploy DEPLOY_SCRIPT=DeployAA.s.sol
.PHONY: deploy-aa

deploy-mocks: ## Deploys the mock contracts.
	$(eval $(call set-deployment-name,mocks))
	make deploy DEPLOY_SCRIPT=DeployMocks.s.sol
.PHONY: deploy-mocks

deploy-random: ## Deploys the randomness contracts and saves the deployment.
	$(eval $(call set-deployment-name,random))
	make deploy DEPLOY_SCRIPT=DeployRandom.s.sol
.PHONY: deploy-random

####################################################################################################
