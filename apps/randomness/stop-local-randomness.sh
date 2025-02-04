
#!/bin/bash

# Minimal comments in English
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if pgrep anvil > /dev/null; then
  echo "Stopping anvil..."
  pkill anvil
fi

PID_FILE="$SCRIPT_DIR/logs/randomness_service.pid"
if [[ -f "$PID_FILE" ]]; then
  RS_PID=$(cat "$PID_FILE")
  if kill -0 "$RS_PID" 2>/dev/null; then
    echo "Stopping randomness service..."
    kill "$RS_PID"
  fi
fi
