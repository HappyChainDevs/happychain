migration-generate: ## Generates a new Migration
	mikro-orm migration:create;
.PHONY: migration-generate

migration-up: ## Runs Migrations
	mikro-orm migration:up;
.PHONY: migration-up

migration-down: ## Reverts Migrations
	mikro-orm migration:down;
.PHONY: migration-down
