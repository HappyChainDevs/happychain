##@ Formatting

check: ## Runs code quality & formatting checks
	@biome check ./;
.PHONT: check

format: ## Formats code and tries to fix code quality issues
	@biome check ./ --write;
.PHONT: format
