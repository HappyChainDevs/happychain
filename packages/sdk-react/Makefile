include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk

dev: node_modules
	if [ -d ./dist ]; then rm -rf dist; fi;
	if [ -d dist]; then touch dist; else mkdir -p dist; fi;
	ln -s ../lib/index.ts ./dist/index.es.js
	ln -s ../lib/index.ts ./dist/index.d.ts
.PHONY: dev

# Will move this to a common makefile once other packages are ported over

build.watch: 
	@# creates symlinks, nothing else to do here
	make dev
.PHONY: build.watch

build: node_modules dist
.PHONY: build

clean:
	rm -rf dist
.PHONY: clean

dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" \) -not -path "./dist/*")
	happyBuild --config build.config.ts
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

node_modules: package.json
	bun install;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;
