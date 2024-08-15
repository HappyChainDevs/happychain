lint:
	pnpm eslint . --report-unused-disable-directives --max-warnings 0
.PHONY: lint

lint-fix:
	pnpm eslint . --report-unused-disable-directives --max-warnings 0 --fix
.PHONY: lint-fix


# Emtpty Stub
build:
.PHONY: build

PRETTIER_PATHS="**/*.{js,cjs,mjs,jsx,ts,tsx,json,css}"
PRETTIER_BASE_IGNORE_PATHS=--ignore-path ../../.gitignore --ignore-path ../../.prettierignore
PRETTIER_LOCAL_IGNORE_PATHS=--ignore-path ./.prettierignore
PRETTIER_IGNORE_PATHS=${PRETTIER_BASE_IGNORE_PATHS} ${PRETTIER_LOCAL_IGNORE_PATHS}

# Runs code quality checks.
check:
	make lint
	pnpm prettier ${PRETTIER_IGNORE_PATHS} --check $(PRETTIER_PATHS)
.PHONY: check

# Runs prettier formatting across webapp files with specified file extensions.
# Also runs make lint-fix.
format:
	make lint-fix
	pnpm prettier ${PRETTIER_IGNORE_PATHS} --write $(PRETTIER_PATHS)
.PHONY: format
