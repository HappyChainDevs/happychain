include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk
include ../../makefiles/help.mk

setup-symlinks::
	@if ! [[ -r ./dist/preact.es.js ]]; then \
		ln -s ../lib/badge.tsx ./dist/preact.es.js; \
		ln -s ../lib/badge.tsx ./dist/preact.es.d.ts; \
	fi
.PHONY: setup-symlinks
