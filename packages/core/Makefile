include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/publishing.mk
include ../../makefiles/help.mk

<<<<<<< HEAD:packages/core/Makefile
test: ## Runs tests
	@bun test .
.PHONY: test
=======
start: ## Starts the randomness service
	node --env-file=.env dist/index.es.js
PHONY: start


migrate: ## Runs pending migrations
	tsx --env-file=.env src/migrate.ts
PHONY: migrate
>>>>>>> 721eb064 (feat(randomness): refactor randomness to process pending commitments):packages/randomness-service/Makefile
