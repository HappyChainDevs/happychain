check:
	biome check ./;
.PHONT: check

format:
	biome check ./ --write;
.PHONT: format
