anvil: ## Runs anvil (local EVM node)
	cd contracts && anvil -b 2 & \
    sleep 5 && \
	forge create src/Counter.sol:Counter --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
.PHONY: anvil
