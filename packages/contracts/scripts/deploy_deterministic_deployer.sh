#!/bin/sh

set -x

# JSON RPC endpoint for the local Geth node
JSON_RPC="http://localhost:1234"

# Start Geth in a Docker container
docker container run --rm -d --name deployment-proxy-geth -p 1234:8545 -e GETH_VERBOSITY=3 keydonix/geth-clique

# Wait for Geth to become responsive
until curl --silent --fail $JSON_RPC -X POST -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0", "id":1, "method": "net_version", "params": []}'; do sleep 1; done

# Define the required variables from deployment.json
MY_ADDRESS="0x913dA4198E6bE1D5f5E4a40D0667f70C0B5430Eb"
ONE_TIME_SIGNER_ADDRESS="0x3fab184622dc19b6109349b94811493bf2a45362"
GAS_PRICE=100000000000
GAS_LIMIT=100000
TRANSACTION="f8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222"
DEPLOYER_ADDRESS="0x4e59b44847b379578588920ca78fbf26c0b4956c"

# Calculate gas cost
GAS_COST="0x$(printf '%x' $(($GAS_PRICE * $GAS_LIMIT)))"

# Send gas money to the signer
curl $JSON_RPC -X POST -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_sendTransaction\", \"params\": [{\"from\":\"$MY_ADDRESS\",\"to\":\"$ONE_TIME_SIGNER_ADDRESS\",\"value\":\"$GAS_COST\"}]}"

# Deploy the deterministic deployer contract
curl $JSON_RPC -X POST -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_sendRawTransaction\", \"params\": [\"0x$TRANSACTION\"]}"

# Define the bytecode of the contract to be deployed
BYTECODE="6080604052348015600f57600080fd5b5060848061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063c3cafc6f14602d575b600080fd5b6033604f565b604051808260ff1660ff16815260200191505060405180910390f35b6000602a90509056fea165627a7a72305820ab7651cb86b8c1487590004c2444f26ae30077a6b96c6bc62dda37f1328539250029"

# Deploy your contract using the deterministic deployer
MY_CONTRACT_ADDRESS=$(curl $JSON_RPC -X POST -H 'Content-Type: application/json' --silent --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_call\", \"params\": [{\"from\":\"$MY_ADDRESS\",\"to\":\"$DEPLOYER_ADDRESS\", \"data\":\"0x0000000000000000000000000000000000000000000000000000000000000000$BYTECODE\"}, \"latest\"]}" | jq --raw-output '.result')

curl $JSON_RPC -X POST -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_sendTransaction\", \"params\": [{\"from\":\"$MY_ADDRESS\",\"to\":\"$DEPLOYER_ADDRESS\", \"gas\":\"0xf4240\", \"data\":\"0x0000000000000000000000000000000000000000000000000000000000000000$BYTECODE\"}]}"

# Call the deployed contract to verify it was deployed successfully
MY_CONTRACT_METHOD_SIGNATURE="c3cafc6f"
RAW_RESULT=$(curl http://localhost:1234 -X POST -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_call\", \"params\": [{\"to\":\"$MY_CONTRACT_ADDRESS\", \"data\":\"0x$MY_CONTRACT_METHOD_SIGNATURE\"}, \"latest\"]}")

# Extract the actual result from the JSON response
RESULT=$(echo "$RAW_RESULT" | jq --raw-output '.result')

echo "Contract call result: $RESULT"

# Expected result is 0x000000000000000000000000000000000000000000000000000000000000002a (hex encoded 42)
EXPECTED_RESULT="0x000000000000000000000000000000000000000000000000000000000000002a"

if [ "$RESULT" = "$EXPECTED_RESULT" ]; then
    echo "Contract deployed and verified successfully!"
else
    echo "Deployment failed or contract did not return the expected result."
fi

# Stop the Docker container running the Geth node
docker container stop deployment-proxy-geth
