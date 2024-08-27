check:
	@echo "Checking..."
	@./node_modules/@happychain/configs/node_modules/.bin/biome check ./
.PHONT: check

format:
	@./node_modules/@happychain/configs/node_modules/.bin/biome check ./ --write
.PHONT: format
