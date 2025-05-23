MODE ?= local

ifeq ($(MODE),local)
  include .env.local
else ifeq ($(MODE),dev)
  include .env.development
else ifeq ($(MODE),prod)
  include .env.production
else
  include .env
endif

# Unconditionally include overrides (fail if missing)
-include .env.generated

.PHONY: try-env
try-env:
	echo "Env Loaded! $(WHAT)"
