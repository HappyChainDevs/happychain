#!/bin/sh

set -x

JSON_RPC="http://localhost:1234"

# Start geth in a local container
docker container run --rm -d --name deployment-proxy-geth -p 1234:8545 -e GETH_VERBOSITY=3 keydonix/geth-clique

# Wait for geth to become responsive
until curl --silent --fail $JSON_RPC -X 'POST' -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"net_version\", \"params\": []}"; do sleep 1; done

# Extract the variables we need from json output
MY_ADDRESS="0x913dA4198E6bE1D5f5E4a40D0667f70C0B5430Eb"
ONE_TIME_SIGNER_ADDRESS="0x3fab184622dc19b6109349b94811493bf2a45362"
GAS_PRICE=100000000000
GAS_LIMIT=100000
TRANSACTION="0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222"
DEPLOYER_ADDRESS="0x4e59b44847b379578588920ca78fbf26c0b4956c"
GAS_COST="0x$(printf '%x' $((GAS_PRICE * GAS_LIMIT)))"

# Send gas money to signer
curl $JSON_RPC -X 'POST' -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_sendTransaction\", \"params\": [{\"from\":\"$MY_ADDRESS\",\"to\":\"$ONE_TIME_SIGNER_ADDRESS\",\"value\":\"$GAS_COST\"}]}"

# Deploy the deployer contract
curl $JSON_RPC -X 'POST' -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_sendRawTransaction\", \"params\": [\"$TRANSACTION\"]}"

# Verify that the contract is deployed at the expected address
DEPLOYER_BYTECODE=$(curl --silent $JSON_RPC -X POST -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_getCode\", \"params\": [\"$DEPLOYER_ADDRESS\", \"latest\"]}" | jq --raw-output '.result')

EXPECTED_BYTECODE="0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3"

if [ "$DEPLOYER_BYTECODE" != "$EXPECTED_BYTECODE" ]; then
  echo "Deployer contract bytecode does not match expected bytecode. Deployment failed."
  docker container stop deployment-proxy-geth
  exit 1
else
  echo "Deployer contract deployed successfully with correct bytecode."
fi

# Proceed with further steps
BYTECODE="6080604052348015600f57600080fd5b5060848061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063c3cafc6f14602d575b600080fd5b6033604f565b604051808260ff1660ff16815260200191505060405180910390f35b6000602a90509056fea165627a7a72305820ab7651cb86b8c1487590004c2444f26ae30077a6b96c6bc62dda37f1328539250029"
MY_CONTRACT_ADDRESS=$(curl $JSON_RPC -X POST -H 'Content-Type: application/json' --silent --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_call\", \"params\": [{\"from\":\"$MY_ADDRESS\",\"to\":\"$DEPLOYER_ADDRESS\", \"data\":\"0x0000000000000000000000000000000000000000000000000000000000000000$BYTECODE\"}, \"latest\"]}" | jq --raw-output '.result')

curl $JSON_RPC -X POST -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_sendTransaction\", \"params\": [{\"from\":\"$MY_ADDRESS\",\"to\":\"$DEPLOYER_ADDRESS\", \"gas\":\"0xf4240\", \"data\":\"0x0000000000000000000000000000000000000000000000000000000000000000$BYTECODE\"}]}"

# Call our contract to verify (NOTE: MY_CONTRACT_ADDRESS is the same no matter what chain we deploy to!)
MY_CONTRACT_METHOD_SIGNATURE="c3cafc6f"
RAW_RESULT=$(curl --silent $JSON_RPC -X POST -H 'Content-Type: application/json' --data "{\"jsonrpc\":\"2.0\", \"id\":1, \"method\": \"eth_call\", \"params\": [{\"to\":\"$MY_CONTRACT_ADDRESS\", \"data\":\"0x$MY_CONTRACT_METHOD_SIGNATURE\"}, \"latest\"]}")
RESULT=$(echo "$RAW_RESULT" | jq --raw-output '.result')

echo "Contract call result: $RESULT"

EXPECTED_RESULT="0x000000000000000000000000000000000000000000000000000000000000002a"

if [ "$RESULT" = "$EXPECTED_RESULT" ]; then
  echo "Contract deployed and verified successfully!"
else
  echo "Deployment failed or contract did not return the expected result."
fi

# Shutdown Parity
docker container stop deployment-proxy-geth
