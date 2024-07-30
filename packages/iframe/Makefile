dev:
	pnpm vite
.PHONY: dev

build:
	tsc -b && pnpm vite build
.PHONY: build

lint:
	pnpm eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
.PHONY: lint

preview:
	pnpm vite preview
.PHONY: preview
