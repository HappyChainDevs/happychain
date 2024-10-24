SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk

setup-symlinks::
	@if ! [[ -r ./dist/runtime.es.js ]]; then \
  		ln -s ../src/runtime/index.ts ./dist/runtime.es.js; \
  		ln -s ../src/runtime/index.ts ./dist/runtime.es.ts; \
	fi
.PHONY: setup-symlinks
