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

# Type of proxy contract to use for happy accounts in DeployBoop.s.sol.
# Valid values: "BEACON" or "UUPS". Defaults to BEACON.
export PROXY_TYPE ?= BEACON

# Port at which Anvil will be running.
export ANVIL_PORT ?= 8545

# Block time for Anvil, automining if 0
export ANVIL_BLOCK_TIME ?= 2

ANVIL_BLOCK_TIME_ARG := $(if $(findstring '0','$(ANVIL_BLOCK_TIME)'),,--block-time $(ANVIL_BLOCK_TIME))

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
	ln $(LN_FLAGS) ../$(NODE_MODULES)/forge-std lib/forge-std
	ln $(LN_FLAGS) ../$(NODE_MODULES)/@kevincharm/bls-bn254 lib/bls-bn254
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
	@# Avoid failures when trying to clean after a preceding `make nuke`.
	forge clean > /dev/null 2> /dev/null || true
	rm -rf node_modules/.tmp
	rm -rf docs
.PHONY: clean

nuke: clean ## Removes build output and dependencies
	rm -rf lib
.PHONY: nuke

####################################################################################################
##@ Testing

test: ## Runs tests
	forge test -vvv
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

####################################################################################################
# Boop Unit Tests

test-boop-suite:
	@make test-boop-libs
	@make test-callInfoEncoding
	@make test-entryPoint
	@make test-happyAccount
	@make test-happyPaymaster
	@make test-batchCallExecutor
	@make test-sessionKeyValidator
	@make test-happyAccountFactory
	@make test-happyAccount-upgradeability
	@make test-predictDeploymentAddress
.PHONY: test-boop-suite

test-boop-libs:
	forge test --match-contract EncodingTest -vvv
	forge test --match-contract UtilsTest -vvv
.PHONY: test-boop-libs

test-callInfoEncoding:
	forge test --match-contract CallInfoEncodingTest -vvv
.PHONY: test-callInfoEncoding

test-entryPoint:
	forge test --match-contract EntryPointTest -vvv
.PHONY: test-entryPoint

test-happyAccount:
	forge test --match-contract HappyAccountTest -vvv
.PHONY: test-happyAccount

test-happyPaymaster:
	forge test --match-contract HappyPaymasterTest -vvv
.PHONY: test-happyPaymaster

test-batchCallExecutor:
	forge test --match-contract BatchCallExecutorTest -vvv
.PHONY: test-batchCallExecutor

test-sessionKeyValidator:
	forge test --match-contract SessionKeyValidatorTest -vvv
.PHONY: test-sessionKeyValidator

test-happyAccountFactory:
	forge test --match-contract HappyAccountFactoryTest -vvv
.PHONY: test-happyAccountFactory

test-happyAccount-upgradeability:
	forge test --match-contract UpgradeHappyAccountUUPSProxyTest -vvv
	forge test --match-contract UpgradeHappyAccountBeaconProxyTest -vvv
.PHONY: test-happyAccount-upgradeability

test-predictDeploymentAddress:
	@bun test scripts/utils/__tests__/getAddressERC1967.test.ts
.PHONY: test-predictDeploymentAddress

####################################################################################################
# Gas Logging

# Turn gas logging on by uncommenting the measurement statements
gas-logging-on:
	@find . -type f -name "*.sol" -exec sed -i '' 's|// \[LOGGAS\]|/* [LOGGAS] */|g' {} +
	@echo "Gas logging turned ON"
.PHONY: gas-logging-on

# Turn gas logging off by commenting out the measurement statements
gas-logging-off:
	@find . -type f -name "*.sol" -exec sed -i '' 's|/\* \[LOGGAS\] \*/|// [LOGGAS]|g' {} +
	@echo "Gas logging turned OFF"
.PHONY: gas-logging-off

# Generates a flamechart for the gas usage of the Paymaster contract.
paymaster-flamechart:
	forge test -vv --match-contract GasEstimator --rpc-url $(RPC_LOCAL) --isolate --flamechart
.PHONY: test-aa-gas-flamechart

####################################################################################################
##@ Code Quality

forge-fmt-check:
	@forge fmt --check src || true
.PHONY: forge-fmt-check

forge-fmt:
	@biome check ./scripts --write;
	@forge fmt src || true
.PHONY: forge-fmt

solhint-check:
	solhint --config ./.solhint.json "src/**/*.sol";
.PHONY: solhint-check

solhint:
	solhint --config ./.solhint.json "src/**/*.sol" --fix --noPrompt;
.PHONY: solhint

check: forge-fmt-check solhint-check ## Checks formatting & linting (no files touched)
	biome check ./;
.PHONY: check

format: forge-fmt solhint ## Formats & lint (autofixes)
	biome check ./ --write;
.PHONY: format

####################################################################################################
# Docs

DOCS_OUT=docs/boop

BOOP_SOL_FILES := $(shell find src/boop -type f -name '*.sol')

patch-docs:
	@for file in $(BOOP_SOL_FILES); do \
		cp $$file $$file.bak; bun run scripts/utils/postProcessDocLinks.ts $$file.bak > $$file; \
	done
.PHONY: patch-docs

unpatch-docs:
	@for file in $(BOOP_SOL_FILES); \
		do if [ -f $$file.bak ]; then mv $$file.bak $$file; fi;  \
	done
.PHONY: unpatch-docs

# Note on traps: EXIT doesn't catch ctrl+c, but using INT EXIT makes the trap trigger twice on ctrl+c (the
# trap triggers EXIT after handling INT). So we set an empty INT TERM HUP trap, which will trigger EXIT and
# run our logic only once. Note that this doesn't work if the process is interrupted with kill -9 (SIGKILL).

docs:
	@make unpatch-docs # cleanup previously aborted run, just in case
	@trap 'make unpatch-docs; echo "Docs cleanup complete."' EXIT; \
	trap 'exit' INT TERM HUP; \
	make patch-docs; \
	forge doc --out docs/boop;
.PHONY: docs

docs-serve: unpatch-docs
	@make unpatch-docs # cleanup previously aborted run, just in case
	@trap 'make unpatch-docs; echo "Docs cleanup complete."' EXIT; \
	trap 'exit' INT TERM HUP; \
	make patch-docs; \
	forge doc --out docs/boop --serve --port $(DOCS_PORT);
.PHONY: docs-serve

####################################################################################################
##@ Devnet

anvil: ## Runs anvil at $ANVIL_PORT (blocking)
	anvil --port $(ANVIL_PORT) $(ANVIL_BLOCK_TIME_ARG) --print-traces
.PHONY: anvil

anvil-background: ## Runs anvil at in the background at $ANVIL_PORT, logging to anvil.log
	anvil --port $(ANVIL_PORT) $(ANVIL_BLOCK_TIME_ARG) > anvil.log 2>&1 &
	@echo "Running Anvil at {http,ws}://localhost:$(ANVIL_PORT)"
.PHONY: anvil-background

kill-anvil: ## Kill an existing Anvil process running at $ANVIL_PORT
	@lsof -t -iTCP:$(ANVIL_PORT) -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
.PHONY: kill-anvil

####################################################################################################
##@ Deployment

strip_quotes = $(shell echo $(1) | sed -e 's/^["'\'']//; s/["'\'']$$//')
VERIFY_FLAG := $(if $(findstring true,$(VERIFY_$(CONFIG))),--verify,)
VERIFIER_FLAG := $(if $(findstring true,$(VERIFY_$(CONFIG))),$(call strip_quotes,$(VERIFIER_FLAG_$(CONFIG))),)
VERIFIER_URL := $(if $(findstring true,$(VERIFY_$(CONFIG))),$(call strip_quotes,$(VERIFIER_URL_$(CONFIG))),)
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
		$(VERIFIER_URL) \
		$(METADATA_FLAG) -vvvv
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
		$(VERIFIER_URL) \
		$(METADATA_FLAG) -vvvv
endef

# Post-processes the deployment output.
define post-deploy
	@# Print address logs from the deploy script.
	@cat out/deployment.json && printf "\n"

	@# Extract ABIs from the deployed contracts and save to out/abis.json.
	@# The metadata flag is crucial to avoid invalidating the build.
	@export CONTRACTS=$$(bun node-jq '[.[]] | unique' out/abiMap.json) && \
	node-jq '[.[]] | unique[]' out/abiMap.json \
		| xargs -I'{}' forge inspect {} abi --json $(METADATA_FLAG) \
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
#    The command up to xargs sequentially emit the ABI (JSON objects) of each contract.
#	 The jq command in the '--slurp' line starts by creating [CONTRACTS, ArrayOfABIs]
#    It then transposes it: [ ["Contract1", ABI1], ["Contract2", ABI2], ... ]
#    Finally, it maps it to [{ "Contract1": ABI1 } , { "Contract2": ABI2 } , ... ]
#    then joins alls of them in a single JSON dictionary.

# Saves all information pertaining to a deployment to deployments/$DEPLOYMENT_NAME.
# The suggested $DEPLOYMENT_NAME format is "CHAIN/NAME", e.g. "happy-sepolia/aa".
# Will save the latest deployment from $DEPLOY_SCRIPT.
define save-deployment
	@mkdir -p deployments/$(DEPLOYMENT_NAME)
	@cp -f out/{deployment.json,abiMap.json,abis.json,abis.ts} deployments/$(DEPLOYMENT_NAME)
	$(eval __CHAIN_ID := `cast chain-id --rpc-url $(RPC_$(CONFIG))`)
	$(eval __RUN_FILE := broadcast/$(DEPLOY_SCRIPT)/$(__CHAIN_ID)/run-latest.json)
	@echo "Saved deployment to deployments/$(DEPLOYMENT_NAME)"
endef

####################################################################################################
# Deploy Scripts

# Defines and exports CONFIG
define set-config
	export CONFIG=$(1)
endef

# Sets CHAIN_ID based on RPC.
define set-chain-id
	CHAIN_ID = $(shell cast chain-id --rpc-url $(RPC_$(CONFIG)))
endef

# Sets CHAIN_NAME based on CHAIN_ID when called.
define set-chain-name
	ifeq ($(CHAIN_ID),31337)
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

# Sets CHAIN_ID and CHAIN_NAME, defines and *exports* DEPLOYMENT_NAME = CHAIN_NAME/$(1)
# Call like this: $(eval $(call set-deployment-name,myDeployment))
define set-deployment-name
	$(eval $(set-chain-id))
	$(eval $(set-chain-name))
	# Export for use in recursive make invocations.
	export DEPLOYMENT_NAME := $(CHAIN_NAME)/$(1)
endef

deploy-l1: ## Deploys the non-upgradeable L1 contracts
	$(eval $(call set-deployment-name,l1))
	make deploy DEPLOY_SCRIPT=DeployL1.s.sol
.PHONY: deploy-l1

deploy-l1-upgradeable: ## Deploys the upgradeable L1 contracts (only for reference)
# Performs checks related to contract upgradeability.
# cf. https://docs.openzeppelin.com/upgrades-plugins/1.x/api-core
ifeq ($(CHECK_UPGRADE),true)
	forge clean && FOUNDRY_PROFILE=upgrade forge build $(METADATA_FLAG) # doesn't work with incremental builds
	openzeppelin-upgrades-core validate --contract HappyERC20Upgradeable;
	openzeppelin-upgrades-core validate --contract HappyERC20Upgraded;
endif
	$(eval $(call set-deployment-name,l1-upgradeable))
	FOUNDRY_PROFILE=upgrade make deploy DEPLOY_SCRIPT=DeployL1Upgradeable.s.sol
.PHONY: deploy-l1-upgradeable

deploy-boop: ## Deploys the Boop contracts.
	$(eval $(call set-deployment-name,boop))
	make deploy DEPLOY_SCRIPT=DeployBoop.s.sol
.PHONY: deploy-boop

deploy-mocks: ## Deploys the mock contracts.
	$(eval $(call set-deployment-name,mocks))
	make deploy DEPLOY_SCRIPT=DeployMocks.s.sol
.PHONY: deploy-mocks

deploy-random: ## Deploys the randomness contracts and saves the deployment.
	$(eval $(call set-deployment-name,random))
	make deploy DEPLOY_SCRIPT=DeployRandom.s.sol
.PHONY: deploy-random

deploy-all: deploy-boop deploy-mocks deploy-random ## Deploys random, mock and boop contracts
.PHONY: deploy-all

deploy-boop-staging: ## Deploys the Boop contracts to testnet as 'staging' (no metadata)
	$(eval $(call set-config,TEST))
	$(eval $(call set-deployment-name,boop-staging))
	make deploy CONFIG=TEST DEPLOY_SCRIPT=DeployBoop.s.sol
.PHONY: deploy-boop-staging

deploy-mocks-staging: ## Deploys the mock contracts to testnet as 'staging' (no metadata)
	$(eval $(call set-config,TEST))
	$(eval $(call set-deployment-name,mocks-staging))
	make deploy CONFIG=TEST DEPLOY_SCRIPT=DeployMocks.s.sol
.PHONY: deploy-mock-staging

deploy-random-staging: ## Deploys the randomness contracts to testnet as 'staging' (no metadata)
	$(eval $(call set-config,TEST))
	$(eval $(call set-deployment-name,random-staging))
	make deploy CONFIG=TEST DEPLOY_SCRIPT=DeployRandom.s.sol
.PHONY: deploy-random-staging

deploy-all-staging: deploy-boop-staging deploy-mocks-staging deploy-random-staging
.PHONY: deploy-all-staging

####################################################################################################
