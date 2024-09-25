TSC_BIN ?= tsc

# Like build.watch but also serves the page on localhost if applicable
dev: node_modules
	if [[ -r index.html ]]; then \
		concurrently --prefix=none "make build.watch" "make preview"; \
	else \
	  	make build.watch; \
	fi
.PHONY: dev

# Generates type definitions and bundles the project
build: node_modules dist
.PHONY: build

# Removes generated files
clean:
	rm -rf dist
.PHONY: clean

# Regenerates type definitions and bundles the project on file changes
build.watch:
	concurrently --prefix=none "make types.watch" "make bundle.watch";
.PHONY: build.watch

# Regenerates type definition on file changes
types.watch: node_modules
	$(TSC_BIN) --build --watch --preserveWatchOutput;
.PHONY: types.watch

# Rebuilds (but does not generate types) on file changes
bundle.watch: node_modules
	bun --watch --no-clear-screen run bundle.ts;
.PHONY: build.watch

# Preview the project (with hot module replacement, so not actually "vite preview"!)
preview: node_modules
	bunx --bun vite
.PHONY: preview

# You can add dependencies to this rule in the Makefile in which `typescript.mk` is inluded.
dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.vue" \) -not -path "./dist/*")
	$(TSC_BIN) --build --force;
	rm -f dist/*.d.ts # pesky config-file type definitions
	rm -f dist/*.tsbuildinfo # make can keep track of the need to rebuild for us
	rm -f ../configs/bundle.d.ts
	bun run bundle.ts;

# Build with Vite — we prefer bundling with bun, but bun does not bundle to UMD or CJS, so we will need to keep
# a version of this so that our packages can be used in non-ESM environments.
legacy_vite_build: node_modules $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.vue" \) -not -path "./dist/*")
	$(TSC_BIN) --build --force;
	rm -f dist/*.d.ts # pesky config-file type definitions
	rm -f dist/*.tsbuildinfo # make can keep track of the need to rebuild for us
	rm -f ../configs/bundle.d.ts
	vite build;

node_modules: package.json
	pnpm install
	@touch $@
