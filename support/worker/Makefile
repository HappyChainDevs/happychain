SRC_ROOT_DIR := src

include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk

setup-symlinks::
	mkdir -p dist/runtime;
	@if ! [[ -r ./dist/runtime.es.js ]]; then \
  		ln -sf ../src/runtime.ts ./dist/runtime.es.js; \
  		ln -sf ../src/runtime.ts ./dist/runtime.es.d.ts; \
	fi
.PHONY: setup-symlinks
