# Submitter Service

The Boop submitter service exposes a REST API to send boops to the an EVM blockchain and query their status.
It either sponsors blockchain fees, or fronts them, to be repaid by the account or by a paymaster contract.

For more information, see the [documentation](https://docs.happy.tech/boop/submitter).

## Quick Start

First, set up the monorepo as per the [top-level README](../../README.md).

To run against a local devnet:

```sh
cp -n .env.example .env
make test # make sure everything is working properly
(cd ../.. && make select-all-local) # ensure env vars are configured for devnet
make migrate # setup up database
make start-anvil # starts Anvil devnet in the background
make deploy-contracts # deploy Boop & mock contracts for testing
make dev # start development server
make kill-anvil # when you're done
```

Running against HappyChain Sepolia:

```sh
cp -n .env.example .env
# configure keys in .env and make sure they are funded
make test # make sure everything is working properly
make migrate # set up database
make test # make sure everything is working properly
make dev # start development server
```

Run `make help` for a list of useful commands.

## Project Structure

```
submitter/
├── bin/                # Misc useful scripts
└── lib/
  ├── server/         # API endpoint definitions
  ├── handlers/       # API route handlers
  ├── clients/        # API clients and interfaces
  ├── services/       # Business logic services
  ├── database/       # Database connection, configuration & types
  │ └── migrations/   # Database migrations (timestamp ordered)
  ├── env/            # Environment variable definitions for submitter configuration
  ├── policies/       # Configurable submitter policies
  ├── types/          # Shared type definitions
  ├── utils/          # Helper functions and utilities
  │ ├── boop/         # ... to work with boops
  │ ├── parsing/      # ... to parse EVM events and errors
  │ ├── test/         # ... for testing
  │ └── validation/   # ... for data validation
  ├── telemetry/      # Telemetry configuration (traces & metrics)
  └── cli/            # CLI tool (used in Makefile commands)
```

## API Documentation

See https://docs.happy.tech/boop/rest
Or if running the docs (`apps/docs`) locally: http://localhost:4000/boop/rest (the submitter needs to be running)
