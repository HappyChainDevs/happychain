#!/bin/bash

# -----------------------------------------------------------------------------
# This script automates the setup and deployment of the Randomness Service on a local host environment.
# It performs the following tasks:
# 1. Verifies that all required tools are installed.
# 2. Cleans up any existing Anvil process and randomness service processes.
# 3. Starts the Anvil local blockchain with specified configurations.
# 4. Retrieves the genesis block timestamp and updates the  HAPPY_GENESIS_ENV_VAR environment variable.
# 5. Deploys necessary smart contracts and fetches the latest Drand round to set the DRAND_ROUND_ENV_VAR  environment variable.
# 6. Prepares and migrates SQLite databases for transaction management and randomness.
# 7. Builds and starts the Randomness Service
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"


ANVIL_RPC_PORT=8545
ANVIL_RPC_URL="http://127.0.0.1:$ANVIL_RPC_PORT"
BLOCK_TIME=2
HAPPY_GENESIS_ENV_VAR="HAPPY_GENESIS_TIMESTAMP_SECONDS"
DRAND_ROUND_ENV_VAR="EVM_DRAND_START_ROUND"
DRAND_URL="https://api.drand.sh/v2/beacons/evmnet/rounds/latest"
RANDOMNESS_DB_PATH="$SCRIPT_DIR/randomness.sqlite"
TXM_DB_PATH="$SCRIPT_DIR/transaction-manager.sqlite"
PM2_PROCESS_NAME="randomness-service"
REQUIRED_TOOLS=("anvil" "curl" "jq" "sqlite3" "sed" "make" "nc" "cast" "pgrep" "pkill" "grep" "awk")


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

check_tools() {
    local missing_tools=()

    for tool in "${REQUIRED_TOOLS[@]}"; do
        if ! command -v "$tool" > /dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo "Error: The following tools are not installed:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo "Please install the missing tools and re-run the script."
        exit 1
    fi
}



check_tools

mkdir -p "$SCRIPT_DIR/logs"

if pgrep anvil > /dev/null; then
    pkill anvil
fi

if [[ -f "$SCRIPT_DIR/logs/randomness_service.pid" ]]; then
    RANDOMNESS_PID=$(cat logs/randomness_service.pid)
    if [[ -n "$RANDOMNESS_PID" ]] && kill -0 "$RANDOMNESS_PID" 2>/dev/null; then
        kill "$RANDOMNESS_PID"
        echo "Randomness service with PID $RANDOMNESS_PID has been stopped."
    else
        echo "No running process found for PID $RANDOMNESS_PID."
    fi
else
    echo "PID file does not exist. No process to stop."
fi

rm -rf logs
mkdir logs

echo "Starting Anvil..."
anvil --block-time $BLOCK_TIME --port $ANVIL_RPC_PORT > "$SCRIPT_DIR/logs/anvil.log" 2>&1 &
ANVIL_PID=$!

# Limit the number of connection attempts to 5
attempts=0
max_attempts=5

while ! nc -z localhost $ANVIL_RPC_PORT; do
    if [[ $attempts -ge $max_attempts ]]; then
        echo "Failed to connect to Anvil after $max_attempts attempts. Exiting."
        exit 1
    fi
    sleep 1
    attempts=$((attempts + 1))
done
    echo "Anvil started with PID $ANVIL_PID."

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
set_env_var .env $HAPPY_GENESIS_ENV_VAR $genesis_timestamp false

echo "Deploying contracts..."
make -C $SCRIPT_DIR/../../contracts deploy-random > $SCRIPT_DIR/logs/deploy-random.log 2>&1
if [[ $? -ne 0 ]]; then
    echo "Error: Failed to deploy contracts. Check the log file for details: $SCRIPT_DIR/logs/deploy-random.log"
    exit 1
fi

echo "Contracts deployed"

echo "Fetching Drand round..."

round=$(curl -s $DRAND_URL | jq -r '.round')

echo "Drand round: $round"

echo "Setting environment variable $DRAND_ROUND_ENV_VAR to $round"
set_env_var .env $DRAND_ROUND_ENV_VAR $round false

make -C $SCRIPT_DIR/../../packages/txm build


empty_sqlite_db $TXM_DB_PATH
echo $TXM_DB_PATH
export TXM_DB_PATH=$TXM_DB_PATH
make -C $SCRIPT_DIR/../../packages/txm migrate

echo "Transaction manager migrated"

make -C $SCRIPT_DIR build

empty_sqlite_db $RANDOMNESS_DB_PATH
echo $RANDOMNESS_DB_PATH
export RANDOMNESS_DB_PATH=$RANDOMNESS_DB_PATH
make -C $SCRIPT_DIR migrate

echo "Randomness service migrated"

echo "Starting randomness service..."
make -C $SCRIPT_DIR start > $SCRIPT_DIR/logs/randomness-service.log 2>&1 &

RANDOMNESS_SERVICE_PID=$!
echo "$RANDOMNESS_SERVICE_PID" > $SCRIPT_DIR/logs/randomness_service.pid

echo "Randomness service started"