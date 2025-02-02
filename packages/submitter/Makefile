include ../../makefiles/lib.mk
include ../../makefiles/vite.mk
include ../../makefiles/help.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

####################################################################################################
# Code Quality

check: lint format-check
	biome check ./;
.PHONY: check

format:
	biome check ./ --write;
.PHONY: format

####################################################################################################
# Server

server:
	@bun run ./src/cmd/index.ts
.PHONY: server