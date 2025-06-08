##@ Formatting

check: ## Runs code quality & formatting checks
	@biome check ./ --error-on-warnings;
.PHONY: check

format: ## Formats code and tries to fix code quality issues
	@biome check ./ --fix --unsafe --error-on-warnings;
.PHONY: format
