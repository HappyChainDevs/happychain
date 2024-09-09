include ../../makefiles/lib.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

# Set CONFIG to "LOCAL" by default. Other valid values: "TEST" or "MAIN".
CONFIG ?= LOCAL

# Deployment mode:
# - "deploy" — deploy contracts normally
# - "dry" — for a dry-run that doesn't send transactions
# - "resume" — resumes the previous deployment
DEPLOY ?= deploy

# Deployment name, used by `make save-deployment` (will save under deployments/$DEPLOYMENT_NAME).
DEPLOYMENT_NAME ?= $(CONFIG)

# Script to run for deployments, or deployment to save for `make save-deployment`.
DEPLOY_SCRIPT ?= DeployL1Upgradeable.s.sol

LN_FLAGS := $(if $(findstring Darwin,$(shell uname)),-shF,-sfT)

# See README.md for more documentation.

# The reason for this weird setup is that the IntelliJ solidity plugin will not resolve imports
# if they're not in `lib` and do not have a `src` directory (the `remappings.txt` file is ignored).
setup:
	if [ ! -f .env ]; then cp .env.example .env; fi
	rm -rf lib
	mkdir -p lib/{openzeppelin,oz-upgradeable}
	ln $(LN_FLAGS) ../node_modules/ExcessivelySafeCall lib/ExcessivelySafeCall
	ln $(LN_FLAGS) ../node_modules/solady lib/solady
	ln $(LN_FLAGS) ../node_modules/kernel lib/kernel
	ln $(LN_FLAGS) ../node_modules/forge-std lib/forge-std
	ln $(LN_FLAGS) ../../node_modules/@openzeppelin/contracts lib/openzeppelin/src
	ln $(LN_FLAGS) ../../node_modules/@openzeppelin/contracts-upgradeable lib/oz-upgradeable/src
.PHONY: setup

####################################################################################################
# Build

build:
	forge build
.PHONY: build

watch:
	forge test --watch src/
.PHONY: watch

clean:
	forge clean
.PHONY: clean

####################################################################################################
# Testing

test:
	forge test -vv
.PHONY: test

testv:
	forge test -vvvv
.PHONY: testv

test-gas:
	forge test --gas-report
.PHONY: test-gas

test-fork:
	forge test --gas-report --fork-url $(RPC_$(CONFIG))
.PHONY: test-fork

####################################################################################################
# Code Quality

check: lint format-check
	biome check ./;
.PHONY: check

format-check:
	forge fmt --check src/*.sol src/test/*.sol src/deploy/*.sol
.PHONY: format-check

lint:
	solhint --config ./.solhint.json "src/*.sol" "src/test/*.sol" "src/deploy/*.sol";
.PHONY: lint

format:
	biome check ./ --write;
	forge fmt src/*.sol src/test/*.sol src/deploy/*.sol
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
CHECK_UPGRADE := make validate-upgrade
VIA_IR_FLAG := $(if $(findstring DeployAA,$(DEPLOY_SCRIPT)),--via-ir,)
OPTIMIZER_RUNS_FLAG := $(if $(findstring DeployAA,$(DEPLOY_SCRIPT)),--optimizer-runs 200,)

ifeq ($(DEPLOY),deploy)
	BROADCAST_FLAG := --broadcast
endif

ifeq ($(DEPLOY),dry)
	BROADCAST_FLAG :=
	VERIFY_FLAG :=
endif

ifeq ($(DEPLOY),resume)
	BROADCAST_FLAG := --resume
	CHECK_UPGRADE :=
endif

# Deploys contracts locally, to testnet or mainnet depending on the $CONFIG value.
# You can also specify MODE=dry to not submit the tx, or MODE=resume to resume the last deployment.
deploy:
	$(CHECK_UPGRADE)
	$(call run-deploy-script,src/deploy/$(DEPLOY_SCRIPT)) $(VIA_IR_FLAG) $(OPTIMIZER_RUNS_FLAG)
	$(call post-deploy,$(DEPLOY_SCRIPT))
.PHONY: deploy

# Performs checks related to contract upgradeability.
# cf. https://docs.openzeppelin.com/upgrades-plugins/1.x/api-core
validate-upgrade:
	forge clean && forge build # doesn't work with incremental builds
	openzeppelin-upgrades-core validate --contract HappyERC20Upgradeable;
	openzeppelin-upgrades-core validate --contract HappyERC20Upgraded;
.PHONY: validate-upgrade

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
		$(VERIFY_FLAG)
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
		$(VERIFY_FLAG)
endef

define post-deploy
	@# Print address logs from the deploy script.
	@cat out/deployment.json && echo "\n"

	$(eval __CHAIN_ID := `cast chain-id --rpc-url $(RPC_$(CONFIG))`)
	$(eval __DRY_RUN_PREFIX := $(if $(findstring dry,$(DEPLOY)),dry-run/,))

	@# Forge script deployment outputs file.
	$(eval __RUN_FILE := broadcast/$(1)/$(__CHAIN_ID)/$(__DRY_RUN_PREFIX)run-latest.json)

	@# Save list of deployed contract names to out/contracts.txt.
	@node-jq '.transactions[] | select(.transactionType == "CREATE") | .contractName' $(__RUN_FILE) \
		| uniq \
		> out/contracts.txt;

	@# Extract ABIs from the deployed contracts and save to out/abis.json.
	@cat out/contracts.txt \
		| xargs -L1 -I'{}' forge inspect {} abi \
		| node-jq --slurp --slurpfile contracts out/contracts.txt '[$$contracts, .] | transpose | map({ (.[0]): .[1] }) | add' \
		> out/abis.json;
	@rm out/contracts.txt

	@# If we wanted to generate typesafe typescript bindings.
    @# @cd ../frontend && pnpm wagmi generate
endef

####################################################################################################
# Save Deployment Information

# Saves all information pertaining to a deployment to deployments/$NAME.
# Will save the latest deployment from $DEPLOY_SCRIPT.
save-deployment:
	@mkdir -p deployments/$(DEPLOYMENT_NAME)
	@cp -f out/deployment.json out/abiMap.json out/abis.json deployments/$(DEPLOYMENT_NAME)
	$(eval __CHAIN_ID := `cast chain-id --rpc-url $(RPC_$(CONFIG))`)
	$(eval __RUN_FILE := broadcast/$(DEPLOY_SCRIPT)/$(__CHAIN_ID)/run-latest.json)
	@cp $(__RUN_FILE) deployments/$(DEPLOYMENT_NAME)/transactions.json
	@echo "Saved deployment to deployments/$(DEPLOYMENT_NAME)"
.PHONY: save-deployment

####################################################################################################

# Deploy Scripts

deploy-l1:
	make deploy DEPLOY_SCRIPT=DeployL1.s.sol
.PHONY: deploy-l1

deploy-l1up:
	make deploy DEPLOY_SCRIPT=DeployL1Upgradeable.s.sol
.PHONY: deploy-l1up

deploy-aa:
	make deploy DEPLOY_SCRIPT=DeployAA.s.sol
.PHONY: deploy-aa

####################################################################################################

run_aa_demo:
	pnpm tsx ./scripts/account_abstraction_demo.ts
.PHONY: run_aa_demo
