# Like build.watch but also serves the page on localhost if applicable
dev: node_modules
	if [[ -r index.html ]]; then \
	  concurrently --prefix=none "make build.watch" "vite"; \
	else \
		make build.watch; \
	fi
.PHONY: dev

build: node_modules dist
.PHONY: build

clean:
	rm -rf dist
.PHONY: clean

# Rebuilds on file change, but does not bundle — site can still be served locally via `vite`
build.watch: node_modules
	tsc --build --watch --preserveWatchOutput;
.PHONY: build.watch

preview: node_modules dist
	vite preview;
.PHONY: preview

# You can add dependencies to this rule in the Makefile in which `vite.mk` is inluded.
dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.vue" \) -not -path "./dist/*")
	tsc --build;
	vite build;

node_modules: package.json
	pnpm install
