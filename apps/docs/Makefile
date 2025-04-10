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
	make typedoc;
	make vocs.watch;
.PHONY: dev

# precompile API reference docs, then build full vocs output
build: typedoc vocs ## Generates the latest docs from source code
.PHONY: build

clean: typedoc.clean ## Removes build artifacts
	rm -rf src/dist
	rm -rf vocs.config.ts.timestamp-*
	rm -rf node_modules/.tmp
.PHONY: clean

preview: ## Previews previously built docs
	vocs preview;
.PHONY: preview

# build vocs docs from supplied markdown
vocs:
	vocs build;
	rm -rf vocs.config.ts.timestamp-*
.PHONY: vocs

# build and watch for changes using dev server
vocs.watch:
	vocs dev;
.PHONY: vocs.watch

# generate all markdown API reference
typedoc: ## Generates the markdown files from package source code
	concurrently --names "js,react,vue,boop-sdk,txm"\
		'make typedoc-js'\
		'make typedoc-react'\
		'make typedoc-vue'\
		'make typedoc-boop-sdk'\
		'make typedoc-txm';
.PHONY: typedoc

typedoc.clean:
	rm -rf src/pages/sdk/{js,react,vue}/api
	rm -rf src/pages/boop/{sdk}/api
	rm -rf src/pages/txm/api
.PHONY: typedoc

# generate JS markdown API reference
typedoc-js:
	typedoc --options ./typedoc.core.js;
	@# Relative link inherited from Viem docs triggers a dead link
	sed -i.bak 's|/docs/glossary/terms#filter|https://viem.sh/docs/glossary/terms#filter|g' \
		./src/pages/sdk/js/api/interfaces/HappyPublicClient.mdx;
	rm ./src/pages/sdk/js/api/interfaces/HappyPublicClient.mdx.bak
.PHONY: typedoc-js

# generate React markdown API reference
typedoc-react:
	typedoc --options ./typedoc.react.js;
.PHONY: typedoc-react

# generate Vue markdown API reference
typedoc-vue:
	typedoc --options ./typedoc.vue.js;
.PHONY: typedoc-vue

# generate Boop SDK markdown API reference
typedoc-boop-sdk:
	typedoc --options ./typedoc.boop-sdk.js;
.PHONY: typedoc-boop-sdk

# generate Transaction Manager markdown API reference
typedoc-txm:
	typedoc --options ./typedoc.txm.js;
.PHONY: typedoc-txm
