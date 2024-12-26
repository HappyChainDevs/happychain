ANVIL_RPC_URL="http://127.0.0.1:8545"
BLOCK_TIME=2
HAPPY_GENESIS_ENV_VAR="HAPPY_GENESIS_TIMESTAMP_SECONDS"
DRAND_ROUND_ENV_VAR="EVM_DRAND_START_ROUND"
DRAND_URL="https://api.drand.sh/v2/beacons/evmnet/rounds/latest"
RANDOMNESS_DB_PATH="$(pwd)/randomness.sqlite"
TXM_DB_PATH="$(pwd)/transaction-manager.sqlite"
PM2_PROCESS_NAME="randomness-service"


mkdir -p logs

# Function to add or update a variable in a .env file
set_env_var() {
  local FILE_PATH="$1"
  local VAR_NAME="$2"
  local VAR_VALUE="$3"
  local HAS_EXPORT="$4"

  # Check if all three arguments are provided
  if [[ -z "$FILE_PATH" || -z "$VAR_NAME" || -z "$VAR_VALUE" ]]; then
    echo "Usage: set_env_var <path_to_file> <variable_name> <variable_value> <has_export>"
    return 1
  fi

  local PREFIX=""
  if [[ "$HAS_EXPORT" == "true" ]]; then
    PREFIX="export "
  fi

  if grep -q "^${PREFIX}${VAR_NAME}=" "$FILE_PATH"; then
    # Variable exists; replace its value
    if sed --version >/dev/null 2>&1; then
      # GNU sed (common on Linux)
      sed -i "s/^${PREFIX}${VAR_NAME}=.*/${PREFIX}${VAR_NAME}=${VAR_VALUE}/" "$FILE_PATH"
    else
      # BSD sed (common on macOS)
      sed -i '' "s/^${PREFIX}${VAR_NAME}=.*/${PREFIX}${VAR_NAME}=${VAR_VALUE}/" "$FILE_PATH"
    fi

    if [[ $? -eq 0 ]]; then
      echo "The variable '${VAR_NAME}' has been updated in '${FILE_PATH}'."
    else
      echo "Error: Could not update the variable '${VAR_NAME}' in '${FILE_PATH}'."
      return 1
    fi
  else
    # Variable does not exist; append it to the file
    echo "\n${PREFIX}${VAR_NAME}=${VAR_VALUE}" >> "$FILE_PATH"
    if [[ $? -eq 0 ]]; then
      echo "The variable '${VAR_NAME}' has been added to '${FILE_PATH}'."
    else
      echo "Error: Could not add the variable '${VAR_NAME}' to '${FILE_PATH}'."
      return 1
    fi
  fi

  return 0
}


empty_sqlite_db() {
    local DB_PATH="$1"
    
    if [[ -f "$DB_PATH" ]]; then
        tables=$(sqlite3 "$DB_PATH" ".tables")
        
        if [[ -z "$tables" ]]; then
            echo "The database '$DB_PATH' is empty or has no tables."
            return 0
        fi
        
        for table in $tables; do
            echo $table
            sqlite3 "$DB_PATH" "DROP TABLE \"$table\";"
            if [[ $? -eq 0 ]]; then
                echo "Data deleted from table '$table' in '$DB_PATH'."
            else
                echo "Error deleting data from table '$table' in '$DB_PATH'."
                return 1
            fi
        done

        echo "The database '$DB_PATH' has been successfully emptied."
    else
        echo "The database '$DB_PATH' does not exist. A new empty database will be created."
        sqlite3 "$DB_PATH" ""
        if [[ $? -eq 0 ]]; then
            echo "Database '$DB_PATH' created."
        else
            echo "Error creating the database '$DB_PATH'."
            return 1
        fi
    fi
}

pkill anvil
RANDOMNESS_PID=$(cat logs/randomness_service.pid)

if [[ -n "$RANDOMNESS_PID" ]]; then
    kill "$RANDOMNESS_PID"
fi

rm -rf logs
mkdir logs

if ! nc -z localhost 8545; then
        echo "Starting Anvil..."
        anvil --block-time $BLOCK_TIME > logs/anvil.log 2>&1 &
        ANVIL_PID=$!
        while ! nc -z localhost 8545; do
            sleep 1
        done
        echo "Anvil started with PID $ANVIL_PID."
else
        echo "Anvil is already running."
fi

genesis_block=$(cast block 0 --rpc-url $ANVIL_RPC_URL)

if [[ -z "$genesis_block" ]]; then
    echo "Error: Failed to get genesis block"
    exit 1
fi

genesis_timestamp=$(echo "$genesis_block" | grep '^timestamp' | awk '{print $2}')

if [[ -z "$genesis_timestamp" ]]; then
    echo "Error: Failed to get genesis timestamp"
    exit 1
fi

echo "Genesis timestamp: $genesis_timestamp"

echo "Setting environment variable $HAPPY_GENESIS_ENV_VAR to $genesis_timestamp"
set_env_var ../contracts/.env $HAPPY_GENESIS_ENV_VAR $genesis_timestamp true
set_env_var .env $HAPPY_GENESIS_ENV_VAR $genesis_timestamp false

echo "Deploying contracts..."
make -C ../contracts deploy-random > logs/deploy-random.log 2>&1

echo "Contracts deployed"

echo "Fetching Drand round..."

round=$(curl -s $DRAND_URL | jq -r '.round')

echo "Drand round: $round"

echo "Setting environment variable $DRAND_ROUND_ENV_VAR to $round"
set_env_var .env $DRAND_ROUND_ENV_VAR $round false

make -C ../transaction-manager build

empty_sqlite_db $TXM_DB_PATH
echo $TXM_DB_PATH
export TXM_DB_PATH=$TXM_DB_PATH
make -C ../transaction-manager migrate

echo "Transaction manager migrated"

make build

empty_sqlite_db $RANDOMNESS_DB_PATH
echo $RANDOMNESS_DB_PATH
export RANDOMNESS_DB_PATH=$RANDOMNESS_DB_PATH
make migrate

echo "Randomness service migrated"

echo "Starting randomness service..."
make start > logs/randomness-service.log 2>&1 &

RANDOMNESS_SERVICE_PID=$!
echo "$RANDOMNESS_SERVICE_PID" > logs/randomness_service.pid

echo "Randomness service started"