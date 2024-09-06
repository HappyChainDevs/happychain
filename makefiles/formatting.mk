# Use the path to the biome version installed in configs directory
# This ensures all packages are using the same biome version, 
# along with the same biome config
PATH := ./node_modules/@happychain/configs/node_modules/.bin:$(PATH)

check:
	@# The semicolon is needed to prevent a Mac-specific issue where the path is not being recognized.
	@# Might be an issue related to the handling of symlinks.
	@# https://stackoverflow.com/a/21709821/298664
	biome check ./;
.PHONT: check

format:
	biome check ./ --write;
.PHONT: format
