include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/publishing.mk
include ../../makefiles/help.mk

test: ## Runs tests
	@bun test .
.PHONY: test

setup-symlinks::
	@mkdir -p dist
	@if ! [[ -r ./dist/wagmi.es.js ]]; then \
  		ln -sf ../$(SRC_ROOT_DIR)/wagmi.ts ./dist/wagmi.es.js; \
  		ln -sf ../$(SRC_ROOT_DIR)/wagmi.ts ./dist/wagmi.es.d.ts; \
		mkdir -p node_modules/.tmp; \
		touch node_modules/.tmp/.dev; \
	fi
.PHONY: setup-symlinks