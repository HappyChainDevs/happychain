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
	bun tsc --build tsconfig.types.json --watch;
.PHONY: build.tsc.watch
