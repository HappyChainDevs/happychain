SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

setup-local: ## Sets up local environment and runs everything
	./start-local-randomness.sh
.PHONY: setup-local

stop-local: ## Kills anvil and the randomness service
	./stop-local-randomness.sh
.PHONY: stop-local

start: ## Starts the randomness service
	node --env-file=.env dist/index.es.js
.PHONY: start

migrate: ## Runs pending migrations
	node --env-file=.env dist/migrate.es.js
PHONY: migrate

link-anvil:
	rm src/ABI/random.ts
	ln -s ../../../../contracts/deployments/anvil/random/abis.ts src/ABI/random.ts
.PHONY: link-anvil

link-happy-sepolia:
	rm src/ABI/random.ts
	ln -s ../../../../contracts/deployments/happy-sepolia/random/abis.ts src/ABI/random.ts
.PHONY: link-happy-sepolia
