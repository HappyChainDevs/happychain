# Use the path to the biome version installed in configs directory
# This ensures all packages are using the same biome version, 
# along with the same biome config
PATH := ./node_modules/@happychain/configs/node_modules/.bin/:$(PATH)

check:
	biome check ./
.PHONT: check

format:
	biome check ./ --write
.PHONT: format
