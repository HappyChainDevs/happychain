include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk

dev:: node_modules 
	@rm ./dist/index.es.js
	@rm ./dist/index.es.d.ts
	@ln -s ../src/index.ts ./dist/index.js
	@ln -s ../src/index.ts ./dist/index.d.ts
	@ln -s ../src/runtime/index.ts ./dist/runtime.js
	@ln -s ../src/runtime/index.ts ./dist/runtime.d.ts
.PHONY: dev
