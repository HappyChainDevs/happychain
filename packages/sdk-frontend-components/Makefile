include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk

dev:: node_modules
	@ln -s ../lib/badge.tsx ./dist/preact.es.js
	@ln -s ../lib/badge.tsx ./dist/preact.es.d.ts
.PHONY: dev
