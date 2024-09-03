PATH := ./node_modules/.bin:$(PATH)

include ../../makefiles/formatting.mk

# Vocs seems unstable, and changes to several files like this
# can crash it easily. Leaving this here, as it is convenient
# but if you plan on working on documentation for awhile
# you are better off running in three seperate terminals
# so you can restart vocs when needed
dev:
	concurrently \
		'make typedoc-js.watch'\
		'make typedoc-react.watch'\
		'make vocs.watch'
.PHONY: dev

# precompile API reference docs, then build full vocs output
build:
	make typedoc
	make vocs
.PHONY: build

# Preview production build (run build first)
preview:
	vocs preview
.PHONY: preview

# build vocs docs from supplied markdown
vocs:
	vocs build
.PHONY: vocs

# build and watch for changes using dev server
vocs.watch:
	vocs dev
.PHONY: vocs.watch

# generate all markdown API reference
typedoc:
	concurrently \
		'make typedoc-js'\
		'make typedoc-react'
.PHONY: typedoc

typedoc.clean:
	rm -rf docs/pages/{js,react}/api
.PHONY: typedoc

# generate JS markdown API reference
typedoc-js:
	typedoc --options ./typedoc.vanilla.js
.PHONY: typedoc-js

# generate JS markdown API reference in watch mode
typedoc-js.watch:
	typedoc\
		--watch\
		--options ./typedoc.vanilla.js
.PHONY: typedoc-js.watch

# generate React markdown API reference
typedoc-react:
	typedoc --options ./typedoc.react.js
.PHONY: typedoc-react

# generate React markdown API reference in watch mode
typedoc-react.watch:
	typedoc\
		--watch\
		--options ./typedoc.react.js
.PHONY: typedoc-react.watch

