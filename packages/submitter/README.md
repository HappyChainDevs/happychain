# Submitter Service

The Submitter service handles blockchain transaction submission and management. It provides a robust
API for processing transactions with features like nonce tracking, gas estimation, and transaction
monitoring. While initially developed for Happy Wallet, it can be integrated with any system
requiring blockchain transaction management

## Quick Start

1. Install dependencies:
```sh
make setup
```

2. Set up the database:
```sh
make migrate
```

3. Start development server:
```sh
make dev
```

## Development Commands

### Database Management
- `make migrate` - Run all pending migrations
- `make migrate-fresh` - Reset database and run all migrations
- `make rollback` - Revert last migration

### Server Operations
- `make dev` - Start development server with hot reload
- `make routes` - List all available API endpoints

### Testing
- `make test` - Run all tests
- `make test-watch` - Run tests in watch mode

## Project Structure

```
submitter/
├── .config/          # Configuration files for Kysely setup
├── migrations/       # Database migrations (timestamp ordered)
└── src/
    ├── clients/      # API clients and interfaces
    │   └── submitterClient/
    ├── database/     # Database connections and repositories
    ├── errors/       # Error definitions and handling
    ├── handlers/     # API route handlers
    ├── routes/       # API endpoint definitions
    ├── services/     # Business logic services
    ├── tests/        # End-to-end and integration tests
    ├── tmp/          # Temporary spec interfaces
    ├── utils/        # Helper functions and utilities
    └── validation/   # Data validation utils
```

## API Documentation

The service exposes RESTful endpoints for:
- Account Creation
- Transaction submission
- Transaction status monitoring
- Gas price estimation

View all endpoints with `make routes`
