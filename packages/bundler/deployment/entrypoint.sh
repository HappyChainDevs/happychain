#!/bin/sh
node src/lib/cli/alto.js run --config ./config.json --executor-private-keys $BUNDLER_EXECUTOR_WALLET --utility-private-key $BUNDLER_UTILITY_WALLET
