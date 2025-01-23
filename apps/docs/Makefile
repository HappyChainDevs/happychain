include ../../makefiles/lib.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

# Vocs seems unstable, and changes to several files like this can crash it easily. Leaving this
# here, as it is convenient but if you plan on working on documentation for awhile you are better
# off running in three seperate terminals so you can restart vocs when needed.
#
# Also using concurrently rather than `make -j 3` for the same reason: concurrently restarts
# the three processes as a group if one crashes.
dev: ## Serves the docs in watch mode
	concurrently \
		--restart-tries -1 \
		--names "doc-js,doc-react,docs-vue,vocs" \
		'make typedoc-js.watch'\
		'make typedoc-react.watch'\
		'make typedoc-vue.watch'\
		'make typedoc-txm.watch'\
		'make vocs.watch';
.PHONY: dev

# precompile API reference docs, then build full vocs output
build: typedoc vocs ## Generates the latest docs from source code
.PHONY: build

clean: typedoc.clean ## Removes build artifacts
	rm -rf src/dist
	rm -rf vocs.config.ts.timestamp-*
	rm -rf node_modules/.tmp
.PHONY: clean

# Preview production build
preview: build ## Builds and previews the latest docs
	vocs preview;
.PHONY: preview

# build vocs docs from supplied markdown
vocs:
	vocs build;
.PHONY: vocs

# build and watch for changes using dev server
vocs.watch:
	vocs dev;
.PHONY: vocs.watch

# generate all markdown API reference
typedoc: ## Generates the markdown files from package source code
	concurrently --names "js,react,vue,txm"\
		'make typedoc-js'\
		'make typedoc-react'\
		'make typedoc-vue'\
		'make typedoc-txm';
.PHONY: typedoc

typedoc.clean:
	rm -rf src/pages/sdk/{js,react,vue}/api
	rm -rf src/pages/txm/api
.PHONY: typedoc

# generate JS markdown API reference
typedoc-js:
	typedoc --options ./typedoc.js.js;
.PHONY: typedoc-js

# generate JS markdown API reference in watch mode
typedoc-js.watch:
	typedoc\
		--watch\
		--options ./typedoc.js.js;
.PHONY: typedoc-js.watch

# generate React markdown API reference
typedoc-react:
	typedoc --options ./typedoc.react.js;
.PHONY: typedoc-react

# generate React markdown API reference in watch mode
typedoc-react.watch:
	typedoc\
		--watch\
		--options ./typedoc.react.js;
.PHONY: typedoc-react.watch

# generate Vue markdown API reference
typedoc-vue:
	typedoc --options ./typedoc.vue.js;
.PHONY: typedoc-vue

# generate Vue markdown API reference in watch mode
typedoc-vue.watch:
	typedoc\
		--watch\
		--options ./typedoc.vue.js;
.PHONY: typedoc-vue.watch

# generate Transaction Manager markdown API reference
typedoc-txm:
	typedoc --options ./typedoc.txm.js;
.PHONY: typedoc-txm

# generate Transaction Manager markdown API reference in watch mode
typedoc-txm.watch:
	typedoc\
		--watch\
		--options ./typedoc.txm.js;
.PHONY: typedoc-txm.watch
