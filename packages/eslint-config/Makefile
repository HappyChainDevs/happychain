PRETTIER_PATHS="**/*.{js,cjs,mjs,jsx,ts,tsx,json,css}"

# Runs code quality checks.
check:
	pnpm prettier --check $(PRETTIER_PATHS)
.PHONY: check

# Runs prettier formatting across webapp files with specified file extensions.
# Also runs make lint-fix.
format:
	pnpm prettier --write $(PRETTIER_PATHS)
.PHONY: format
