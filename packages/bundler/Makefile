TARGET ?= local

ALTO_REPO=https://github.com/pimlicolabs/alto.git --branch @pimlico/alto@0.0.4
ALTO_DIR=alto

# Parameterized configuration file path based on TARGET value
CONFIG=configs/config.$(shell echo $(TARGET) | tr '[:upper:]' '[:lower:]').json

# Target to clone Alto repository, install dependencies, and build bundler
build_bundler:
ifeq ($(wildcard $(ALTO_DIR)),)
	@echo "Cloning Alto repository..."
	git clone $(ALTO_REPO) $(ALTO_DIR)
else
	@echo "Alto repository already exists, moving forward..."
endif
	@echo "Setting up the Alto repository..."
	cd $(ALTO_DIR) && pnpm install && pnpm build
	@make select_config
.PHONY: build_bundler

# Target to run the Alto bundler with the appropriate configuration
run_bundler:
	@echo "Running Alto bundler with $(TARGET) config..."
	cd $(ALTO_DIR) && ./alto run --config "config.json"
.PHONY: run_bundler

# Target to select the appropriate config based on the TARGET
select_config:
	@echo "Selecting configuration for $(TARGET)..."
	@cp $(CONFIG) $(ALTO_DIR)/config.json
.PHONY: select_config