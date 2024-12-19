anvil: ## Runs Anvil (local EVM node)
	nohup anvil -b 2 > anvil.log 2>&1 &
	
	ANVIL_PID=$!

	echo "Waiting for Anvil to start..."
	for i in {1..10}; do \
		if nc -z localhost 8545; then \
			echo "Anvil is up and running."; \
			break; \
		fi; \
		sleep 1; \
	done
	
	cd contracts && forge create src/Counter.sol:Counter \
		--rpc-url http://127.0.0.1:8545 \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
.PHONY: anvil

