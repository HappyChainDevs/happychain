build:
	# pnpm wagmi generate
	pnpm next build
.PHONY: build

# Serves webapp in production environment (after building)
serve:
	pnpm next start
.PHONY: serve

# Serves webapp in dev environment (building not required)
dev:
	pnpm next dev
.PHONY: dev

# Runs linter (use make check instead which also checks typescript typing).
lint:
	pnpm next lint --max-warnings 0
.PHONY: lint

# Fixes those linting errors that can be fixed automatically.
lint-fix:
	pnpm eslint . --fix
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