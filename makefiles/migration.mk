migration-generate:
	mikro-orm migration:create;
.PHONY: migration-generate

migration-up:
	mikro-orm migration:up;
.PHONY: migration-up

migration-down:
	mikro-orm migration:down;
.PHONY: migration-down
