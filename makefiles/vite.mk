
PATH := ./node_modules/.bin:$(PATH)

# Like build.watch but also serves the page on localhost if applicable
dev: node_modules
	([[ -r index.html ]] && vite) || make build.watch
.PHONY: dev

# Define 'dist' target in package makefile with a list of dependencies
build: node_modules dist
.PHONY: build

clean:
	rm -rf dist
.PHONY: clean

build.watch: node_modules
	vite build --watch;
.PHONY: build.watch

preview: node_modules dist
	vite preview;
.PHONY: preview

dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.vue" \) -not -path "./dist/*")
	tsc -b;
	vite build;

node_modules: package.json
	pnpm install
