include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk

TSC_BIN ?= tsc

build: node_modules dist
.PHONY: build

dist:
	$(TSC_BIN) --build;

node_modules: package.json
	pnpm install