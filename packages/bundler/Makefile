include ../../makefiles/lib.mk
include ../../makefiles/help.mk

# Set TARGET to "anvil" by default. Other valid values: "sepolia" or "happySepolia".
TARGET ?= anvil

ALTO_REPO := https://github.com/pimlicolabs/alto.git

# Fetch the branch name from alto.version file
ALTO_BRANCH := $(shell cat alto.version)

# Parameterized configuration file path based on TARGET value
ALTO_CONFIG_FILE = configs/config.$(TARGET).json

# Target to set up the repository initially (install dependencies and build)
setup: alto
.PHONY: setup

# Clone or update Alto repository based on alto.version
alto: alto.version
	@echo "Cloning Alto repository based on alto.version..."
	@rm -rf alto
	@git clone $(ALTO_REPO) --branch $(ALTO_BRANCH) alto
	@# Avoid git-in-git confusion
	@rm -rf alto/.git alto/.gitmodules alto/.gitignore
	@git rm --cached alto/pnpm-lock.yaml 2>/dev/null || true
	@make build

# Target to build the bundler
build: install-deps
	cd alto && bunx pnpm run build
.PHONY: build

# Target to install dependencies
install-deps:
	cd alto && bunx pnpm install
.PHONY: install-deps

# Target to run the Alto bundler with the appropriate configuration
run:
	cd alto && ./alto run --config ../$(ALTO_CONFIG_FILE)
.PHONY: run

# Clean up the Alto directory (optional)
clean:
	@if [ -d alto ]; then cd alto && bun clean; fi;
.PHONY: clean

# Remove the Alto directory
nuke: clean
	@if [ -d alto ]; then rm -rf alto; fi;
.PHONY: nuke

####################################################################################################
# Code Quality

check:
	biome check ./ --ignore alto;
.PHONY: check

format:
	biome check ./ --write --ignore alto;
.PHONY: format
