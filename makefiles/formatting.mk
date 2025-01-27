##@ Formatting

check: ## Runs code quality & formatting checks
	@biome check ./;
.PHONY: check

format: ## Formats code and tries to fix code quality issues
	@biome check ./ --write;
.PHONY: format
