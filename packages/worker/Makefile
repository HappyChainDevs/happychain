include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/bundling.mk

build.watch:
	make -j 3 build.entry.watch build.runtime.watch build.tsc.watch
.PHONY: build.watch

build.entry.watch:
	bun --watch build ./src/index.ts --outdir ./dist --external mlly;
.PHONY: build.entry.watch

build.runtime.watch:
	bun --watch build ./src/runtime/index.ts --outdir ./dist/runtime;
.PHONY: build.runtime.watch

build.tsc.watch:
	bun tsc --build tsconfig.build.json --watch;
.PHONY: build.tsc.watch

dev:: node_modules
	@rm -rf ./dist
	@mkdir ./dist
	@ln -s ../src/index.ts ./dist/index.es.js
	@ln -s ../src/index.ts ./dist/index.d.ts
	@ln -s ../src/runtime/index.ts ./dist/runtime.js
	@ln -s ../src/runtime/index.ts ./dist/runtime.d.ts
.PHONY: dev
