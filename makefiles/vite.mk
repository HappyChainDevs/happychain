
PATH := ./node_modules/.bin:$(PATH)

dev: node_modules
	vite;
.PHONY: dev

# Define 'dist' target in package makefile with a list of dependencies
build: node_modules dist
.PHONY: build

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
