include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

setup-symlinks::
	@if ! [[ -r ./dist/txm.es.js ]]; then \
  		ln -sf ../lib/txm.ts ./dist/txm.es.js; \
  		ln -sf ../lib/txm.ts ./dist/txm.es.d.ts; \
	fi
.PHONY: setup-symlinks
