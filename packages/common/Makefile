lint:
	pnpm eslint . --report-unused-disable-directives --max-warnings 0
.PHONY: lint

lint-fix:
	pnpm eslint . --report-unused-disable-directives --max-warnings 0 --fix
.PHONY: lint-fix

PRETTIER_PATHS="**/*.{js,cjs,mjs,jsx,ts,tsx,json,css}"
PRETTIER_IGNORE_PATHS=".next/*"

# Emtpty Stub
build:
.PHONY: build

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
