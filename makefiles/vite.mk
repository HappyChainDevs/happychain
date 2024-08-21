dev:
	pnpm vite
.PHONY: dev

build:
	pnpm tsc -b && pnpm vite build
.PHONY: build

build.watch:
	pnpm vite build --watch
.PHONY: build.watch

preview:
	pnpm vite preview
.PHONY: preview
