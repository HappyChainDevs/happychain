dev: node_modules
	bun scripts/dev.ts
.PHONY: dev

build: node_modules dist
.PHONY: build

clean:
	rm -rf dist
.PHONY: clean

dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.vue" \) -not -path "./dist/*")
	bun scripts/prod.ts

node_modules: package.json
	bun install;
