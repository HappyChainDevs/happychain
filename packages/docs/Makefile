include ../../makefiles/formatting.mk

# Vocs seems unstable, and changes to several files like this
# can crash it easily. Leaving this here, as its convinient
# but if you plan on working on documentation for awhile
# you are better off running in three seperate terminals
# so you can restart vocs when needed
dev:
	make -j 3 typedoc-js.watch typedoc-react.watch vocs.watch
.PHONY: dev

# precompile API reference docs, then build full vocs output
build:
	make -j 2 typedoc-js typedoc-react
	make vocs
.PHONY: build

# Preview production build (run build first)
preview:
	pnpm vocs preview
.PHONY: preview

# build vocs docs from supplied markdown
vocs:
	pnpm vocs build
.PHONY: vocs

# build and watch for changes using dev server
vocs.watch:
	pnpm vocs dev
.PHONY: vocs.watch

# generate all markdown API reference
typedoc:
	make -j 2 typedoc-js typedoc-react
.PHONY: typedoc

# generate JS markdown API reference
typedoc-js:
	pnpm typedoc --options ./typedoc.vanilla.js
.PHONY: typedoc-js

# generate JS markdown API reference in watch mode
typedoc-js.watch:
	pnpm typedoc\
		--watch\
		--options ./typedoc.vanilla.js
.PHONY: typedoc-js.watch

# generate React markdown API reference
typedoc-react:
	pnpm typedoc --options ./typedoc.react.js
.PHONY: typedoc-react

# generate React markdown API reference in watch mode
typedoc-react.watch:
	pnpm typedoc\
		--watch\
		--options ./typedoc.react.js
.PHONY: typedoc-react.watch

