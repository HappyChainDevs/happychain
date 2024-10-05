# Fragment to be imported in packages that need to bundle their typescript code.

build: node_modules dist
.PHONY: build

clean:
	@rm -rf dist
	@rm -rf node_modules/.tmp
.PHONY: clean

# :: rule that can be overriden to add code.
dev:: node_modules
	@echo "$(PKG) — removing dist & installing dev symlinks"
	@make clean
	@mkdir -p dist
	@ln -s ../lib/index.ts ./dist/index.es.js
	@ln -s ../lib/index.ts ./dist/index.es.d.ts
	@mkdir -p node_modules/.tmp
	@touch node_modules/.tmp/.dev
.PHONY: dev

node_modules: package.json
	bun install;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

DIST_DEPS := $(shell find . \
	-type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" \) \
	-not -path "./dist/*")

# If the `.dev` file exists, forces build to run.
# We need this because when running `make dev`, `touch` can update `.dev` with the same (not higher)
# timestamp then the new `dist`.
FORCE_UDPATE := $(shell test -f node_modules/.tmp/.dev && echo force_update)

dist: $(DIST_DEPS) $(FORCE_UDPATE)
	@happyBuild --config build.config.ts
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

force_update:
.PHONY: force_update