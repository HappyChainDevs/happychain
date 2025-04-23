# swarm-leaderboard

## Quickstart

- `bun install` — Install dependencies
- `make dev` — Start the dev server with hot reload
- `make build` — Build the service for production
- `make prod` — Run the built app in production mode
- `make migrate` — Run database migrations (customize as needed)
- `make migrate-fresh` — Reset and re-run migrations
- `make migrate-rollback` — Roll back the last migration

## Initial setup

```bash
make setup
```

## Build

Bundle the service for production:

```bash
make build
```

## Production

Run the built app:

```bash
make prod
```

## Migrations

Migration commands are scaffolded in the Makefile; customize as needed for your DB:

- `make migrate`
- `make migrate-fresh`
- `make migrate-rollback`

This project uses Bun v1.2.10 and is designed for monorepo workflows. See the Makefile for all available tasks.
