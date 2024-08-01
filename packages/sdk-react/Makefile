dev:
	pnpm vite
.PHONY: dev

build:
	tsc -b && pnpm vite build
.PHONY: build

# build only stylesheet
styles:
	mkdir -p dist && pnpm postcss lib/index.css -d ./dist/
.PHONY: styles

preview:
	pnpm vite preview
.PHONY: preview

# Using vitest+jsdon for better react testing support
test:
	pnpm vitest --watch=false
.PHONY: test

lint:
	pnpm eslint . --report-unused-disable-directives --max-warnings 0
.PHONY: lint

lint-fix:
	pnpm eslint . --report-unused-disable-directives --max-warnings 0 --fix
.PHONY: lint-fix

PRETTIER_PATHS="**/*.{js,cjs,mjs,jsx,ts,tsx,json,css}"
PRETTIER_IGNORE_PATHS=".next/*"

# Runs code quality checks.
check:
	make lint
	pnpm prettier --check $(PRETTIER_PATHS)
.PHONY: check

# Runs prettier formatting across webapp files with specified file extensions.
# Also runs make lint-fix.
format:
	make lint-fix
	pnpm prettier --write $(PRETTIER_PATHS)
.PHONY: format
