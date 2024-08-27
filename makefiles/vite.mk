dev:
	@./node_modules/.bin/vite
.PHONY: dev

# Define 'dist' target in package makefile with a list of dependencies
build: dist
.PHONY: build

build.watch:
	@./node_modules/.bin/vite build --watch
.PHONY: build.watch

preview: dist
	@./node_modules/.bin/vite preview
.PHONY: preview

dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" \) -not -path "./dist/*")
	@./node_modules/.bin/tsc -b
	@./node_modules/.bin/vite build
