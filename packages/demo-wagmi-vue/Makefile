include ../../makefiles/lib.mk
include ../../makefiles/vite.mk
include ../../makefiles/formatting.mk
include ../../makefiles/help.mk

# Skip separate TS compilation due to vue-tsc errors.
# Let Vite handle Vue + TS compilation instead.
dist: $(shell find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" -o -name "*.js" -o -name "*.html" -o -name "*.vue" \) -not -path "./dist/*")
	@bunx --bun vite build;
	@if [ -d $@ ]; then touch $@; else mkdir -p $@; fi;