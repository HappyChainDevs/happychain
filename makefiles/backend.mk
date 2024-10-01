TSC_BIN ?= tsc

build: node_modules dist
.PHONY: build

clean:
	rm -rf dist
.PHONY: clean

dist: $(shell find . -type f \( -name "*.ts" -o -name "*.json" -o -name "*.js" \) -not -path "./dist/*")
	$(TSC_BIN) --build;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

node_modules: package.json
	bun install
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;
