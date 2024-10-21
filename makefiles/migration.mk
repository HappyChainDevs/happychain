##@ Migrations

migration-generate: ## Generates a new migration
	mikro-orm migration:create;
.PHONY: migration-generate

migration-up: ## Runs migrations
	mikro-orm migration:up;
.PHONY: migration-up

migration-down: ## Reverts the latest applied migration (can be run multiple times)
	mikro-orm migration:down;
.PHONY: migration-down
