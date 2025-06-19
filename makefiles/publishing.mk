##@ Publishing

pack.dry-run: ## Dry Run package to view bundle size
	bun pm pack --dry-run
.PHONY: pack.dry-run

publish.dry-run: ## Dry Run publish to npm
	bun publish --dry-run
.PHONY: publish.dry-run

publish: prepare-dist ## Publish the package to npm
	# Keep going even if it fails, typically because one of our package does not need an update.
	bun publish --access public  || true
.PHONY: publish

prepare-dist:
	rm -rf dist
	cp -R build dist
.PHONY: prepare-dist

pack: prepare-dist ## Package the tarball to be published manually
	bun pm pack
.PHONY: pack
