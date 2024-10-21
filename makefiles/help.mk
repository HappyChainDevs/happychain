CYAN = \033[0;36m
GREEN = \033[1;36m
BOLD = \033[1m
BLUE = \033[0;34m
PURPLE = \033[0;35m
YELLOW = \033[0;33m
COLOR_OFF = \033[0m

MAKEFILE_NAME := $(firstword $(MAKEFILE_LIST))
MAKEFILE_INCLUDES := $(wordlist 2,$(words $(MAKEFILE_LIST)), $(MAKEFILE_LIST))
RUN_FIGLET = "  $(CYAN)\n$$(bunx figlet $(1))$(COLOR_OFF)"

# App Info (assumes package.json)
APP_NAME = $$(bun --print "try {require('./package.json').name} catch { require('node:path').basename(__dirname) }")
APP_VERSION = $$(bun --print "try {require('./package.json').version} catch { '0.0.0' }")

# Awk Filters
REGEX_CATEGORY = /^\#\#@ /
REGEX_MAKEFILE_TARGET= /^[\.a-zA-Z_0-9-]+:.*?\#\# / 

# string formatting
LABEL_CATEGORY = "  $(BOLD)%s$(COLOR_OFF)\n", substr($$0, 5)
LABEL_MAKEFILE_TARGET = "    $(CYAN)%-18s$(COLOR_OFF) $(YELLOW)%s$(COLOR_OFF)\n", $$1, $$2

# Finds, formats and outputs help documentation
FIND_HELP_COMMANDS := @grep -E '^[\.0-9a-zA-Z_-]*:?.*?\#\#[ @].*$$' $(MAKEFILE_INCLUDES) $(MAKEFILE_NAME)
AWK_REMOVE_INTRO := awk 'BEGIN {FS = "^[^:]*:"}; {printf $$2 "\n"}'
AWK_COLORIZE_COMMANDS := awk 'BEGIN {FS = ":.*?\#\#"}; $(REGEX_MAKEFILE_TARGET) {printf $(LABEL_MAKEFILE_TARGET) } $(REGEX_CATEGORY) { printf $(LABEL_CATEGORY) }'

##@ General

# Follows all makefile includes to supply help where needed.
# The comments are extracted form "##" comments on the same line as the command's name.
# categories are defined by lines that begin with '##@'
# in order for MAKEFILE_LIST to be fully populated, this help.mk
# needs to be the last file to be included: https://ftp.gnu.org/old-gnu/Manuals/make/html_node/make_17.html
help: ## Show this help
	@echo -e $(call RUN_FIGLET, $(APP_NAME))
	@echo ""
	@echo " " $(APP_NAME) v$(APP_VERSION)
	@echo ""
	@echo -e "  Usage: $(BLUE)make$(COLOR_OFF) $(PURPLE)<command>$(COLOR_OFF)"
	@echo -e "  Check $(CYAN)./$(MAKEFILE_NAME)$(COLOR_OFF) for the full list of available commands."
	@echo ""
	@echo "  Specify a command. The suggested choices are:"
	@echo ""
	$(call FIND_HELP_COMMANDS) | $(AWK_REMOVE_INTRO) | $(AWK_COLORIZE_COMMANDS)
.PHONY: help
