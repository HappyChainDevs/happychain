SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

migrate: ## Runs pending migrations
	node --env-file .env dist/migrate.es.js
.PHONY: migrate

link-anvil:
	rm src/ABI/random.ts
	ln -s ../../../../contracts/deployments/anvil/random/abis.ts src/ABI/random.ts
.PHONY: link-anvil

link-happy-sepolia:
	rm src/ABI/random.ts
	ln -s ../../../../contracts/deployments/happy-sepolia/random/abis.ts src/ABI/random.ts
.PHONY: link-happy-sepolia
