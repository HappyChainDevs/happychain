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
	
	# determinstically deploy the Counter contract
	forge script ./contracts/scripts/Deploy.s.sol:CounterScript --broadcast --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

.PHONY: anvil

setup-test-db:
	sqlite3 test.db "CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT);"
	TXM_DB_PATH=/Users/aodhgan/happychain-clone/packages/transaction-manager/test/test.db node ../dist/migrate.es.js
	sqlite3 test.db "SELECT name FROM sqlite_master WHERE type='table' AND name='transaction';"  

.PHONY: setup-test-db

test: anvil setup-test-db
	
	export TXM_DB_PATH=/Users/aodhgan/happychain-clone/packages/transaction-manager/test/test.db; \
	bunx vitest --config ./ts/vite.config.ts ./ts/

.phony: test

run: anvil setup-test-db
	export TXM_DB_PATH=/Users/aodhgan/happychain-clone/packages/transaction-manager/test/test.db; \
	tsx ./ts/run.ts

.phony: run

run-happy-testnet: setup-test-db
	export TXM_DB_PATH=/Users/aodhgan/happychain-clone/packages/transaction-manager/test/test.db; \
	tsx ./ts/runAgainstTestnet.ts

.phony: run-happy-testnet