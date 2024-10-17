# Fragment to be imported in all of our package-level Makefiles, defining useful utilities,
# variables, and empty overridable stub rules (build, test, clean).

# Function that prepends its argument ($(1)) to the PATH environment variable if it does not contain
# it yet. This is done by looking for `:$(1):` within `:$(PATH):`.
#
# Example use: $(call ADD_PATH , ./node_modules/.bin)
# To be used at the top-level of makefile.
#
# Note that due to an issue on Mac, all commands run in the makefile that are found via these path
# additions should add some "complex" syntax (we recommend ending with a semicolon) or they might
# not be recognized. This might be a symlink issue.
# cf. https://stackoverflow.com/a/21709821/298664
#
ADD_PATH = $(eval PATH := $(if $(findstring :$(PATH_TO_ADD):,:$(PATH):),$(PATH),$(1):$(PATH)))

# Unlock more powerful features than plain POSIX sh.
SHELL := /bin/bash

# Enables running bun-installed binaries without going through bun.
$(call ADD_PATH , ./node_modules/.bin)

# Enables running workspace-level bun-installed binaries easily and without going through bun.
# The condition makes sure this is not added in the top-level Makefile itself.
ifeq (,$(wildcard bun.lockb))
$(call ADD_PATH , ../../node_modules/.bin)
endif

# Name of the package the makefile is executed for (based on the current directory).
PKG := $(notdir $(shell pwd))

# Follows all makefile includes to supply help where needed.
# The comments are extracted form "##" comments on the same line as the command's name.
MAKEFILE_NAME := $(firstword $(MAKEFILE_LIST))
MAKEFILE_INCLUDES := $(wordlist 2,$(words $(MAKEFILE_LIST)), $(MAKEFILE_LIST))
RUN_FIGLET = "  \033[0;36m\n$$(bunx figlet $(1))\033[0m"
APP_NAME = $$(bun --print "require('./package.json').name")
APP_VERSION = $$(bun --print "require('./package.json').version")
FIND_HELP_COMMANDS := @grep -E '^[\.0-9a-zA-Z_-]+:.*?\#\# .*$$' $(MAKEFILE_INCLUDES) $(MAKEFILE_NAME) 
AWK_REMOVE_INTRO := awk 'BEGIN {FS = "^[^:]*:"}; {printf $$2 "\n"}' 
AWK_COLORIZE_COMMANDS := awk 'BEGIN {FS = ":.*?\#\# "}; {printf "    \033[0;36m%-18s\033[m %s\n", $$1, $$2}'
help: ## Show this help
	@echo -e $(call RUN_FIGLET, $(APP_NAME))
	@echo ""
	@echo " " $(APP_NAME) v$(APP_VERSION)
	@echo ""
	@echo "  Usage: make <command>"
	@echo "  Check ./$(MAKEFILE_NAME) for the full list of available commands."
	@echo ""
	@echo "  Specify a command. The suggested choices are:"
	@echo ""
	$(call FIND_HELP_COMMANDS) | $(call AWK_REMOVE_INTRO) | $(call AWK_COLORIZE_COMMANDS)
.PHONY: help

# Empty Stubs — these can be overriden in any including Makefile.

build:
.PHONY: build

test:
.PHONY: test

clean:
.PHONY: clean
