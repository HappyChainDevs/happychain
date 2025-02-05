include ../../makefiles/lib.mk
include ../../makefiles/vite.mk
include ../../makefiles/help.mk
include ../../makefiles/formatting.mk

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

# Set CONFIG to "LOCAL" by default. Other valid value "TENDERLY".
# Must be exported as some deploy scripts depend on it.
export CONFIG ?= LOCAL

####################################################################################################
# Server

server:
	@bun run ./src/cmd/index.ts
.PHONY: server