include ../../makefiles/lib.mk

# Set TARGET to "anvil" by default. Other valid values: "sepolia" or "happySepolia".
TARGET ?= anvil

ALTO_REPO := https://github.com/pimlicolabs/alto.git

# Fetch the branch name from alto.version file
ALTO_BRANCH := $(shell cat alto.version)

# Parameterized configuration file path based on TARGET value
ALTO_CONFIG_FILE=configs/config.$(TARGET).json

# Docker image name
IMAGE_NAME ?= happy-bundler

# Clone or update Alto repository based on alto.version
alto: alto.version
	@if [ -d alto ]; then \
		cd alto && git pull && git switch $(ALTO_BRANCH); \
	else \
		git clone $(ALTO_REPO) --branch $(ALTO_BRANCH) alto; \
	fi

# Build target to set up the repository
build: alto
	cd alto && bunx pnpm install && bunx pnpm run build
.PHONY: build

build.docker: alto
	cd alto && docker build -t $(IMAGE_NAME) .
.PHONY: build.docker

# Target to run the Alto bundler with the appropriate configuration
run:
	cd alto && ./alto run --config ../$(ALTO_CONFIG_FILE)
.PHONY: run

# Clean up the Alto directory (optional)
clean:
	cd alto && bun clean
.PHONY: clean

# Remove the Alto directory
nuke: clean
	rm -rf alto
.PHONY: nuke

####################################################################################################
# Code Quality

check:
	biome check ./ --ignore alto;
.PHONY: check

format:
	biome check ./ --write --ignore alto;
.PHONY: format
