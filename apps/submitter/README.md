## Setup

To install dependencies:
```sh
make setup
```

To run migrations:
```sh
make migrate
```

To delete database and re-run migrations
```sh
make migrate-fresh
```

To view available endpoints:
```sh
make routes
```

To run (dev mode):
```sh
make dev
```

To test:
```sh
make test
```

## App Structure

```
submitter/
├── .config/
│   └── # Kysely config
├── migrations/
│   └── # Timestamp ordered migrations
└── src/
    ├── actions/
    │   └── # Execution actions
    ├── clients/
    │   ├── # Viem client entries
    │   └── submitterClient/
    │       └── # Custom submitter actions
    ├── database/
    │   └── # Database Connection & Repositories
    ├── errors/
    │   └── # Error definitions
    ├── nonceQueueManager/
    │   └── # Buffer management
    ├── routes/
    │   └── # API routes
    ├── services/
    │   └── # Data services
    ├── tests/
    │   └── # e2e app tests
    ├── tmp/
    │   └── # copy pasted boop spec interfaces
    └── utils/
        └── # general purpose utilities & helpers
```
