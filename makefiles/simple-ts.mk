# Fragment to be imported for Makefiles that do not need bundling (as handled by the
# happyBuild script). This includes backend packages and frontend support packages.

build: node_modules dist ## Builds package with TSC
.PHONY: build

clean: ## Removes build artifacts
	@rm -rf dist
	@rm -rf node_modules/.tmp
.PHONY: clean

dist: $(shell find . -type f \( -name "*.ts" -o -name "*.json" -o -name "*.js" \) -not -path "./dist/*")
	@tsc --build;
	@# force updates modified_at timestamp;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;

node_modules: package.json
	@bun install
	@# force updates modified_at timestamp
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;
