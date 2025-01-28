##@ Publishing

pack.dry-run: ## Dry Run package to view bundle size
	bun pm pack --dry-run
.PHONY: pack.dry-run

publish.dry-run: ## Dry Run publish to npm
	bun publish --dry-run
.PHONY: publish.dry-run

publish:
	echo "DRY RUN, NOT PUBLISHING!"
	bun publish --dry-run
.PHONY: publish
