# Configs

HappyChain MonoRepo Shared Configs

## Install

Add to your packages `package.json`

```json
"devDependencies": {
    "@happychain/configs": "workspace:^",
}
```

```sh
bun install
```

## Biome Configs
In your package create a `biome.jsonc`
```jsonc
{
	// pull from relative node_modules as biome 
	// doesn't currently resolve from packages automatically
    "$schema": "./node_modules/@happychain/configs/node_modules/@biomejs/biome/configuration_schema.json",
    "extends": ["node_modules/@happychain/configs/biome.jsonc"]
}
```

To customize, simple extend or overwrite
```jsonc
{

    "$schema": "./node_modules/@happychain/configs/node_modules/@biomejs/biome/configuration_schema.json",
    "extends": ["node_modules/@happychain/configs/biome.jsonc"],
	"files": {
		"ignore": [ "./out" ]
	},
	"overrides": [{
		// the path which this rule applies to
		"include": ["docs/snippets"],

		// rules specific to this path
		"linter": {
			"rules": {
				"suspicious": { "noConsoleLog": "off" },
			}
		}
	}]
}
```

## Typescript Configs

Add or update `tsconfig.json` with your preferred config `tsconfig.*.json`

```jsonc
{
	// tsconfig.vite-node.json
	"extends": "@happychain/configs/tsconfig.base.json",
	"include": ["lib"]
}
```

To customize, simple update with the overrides
```jsonc
{
	"extends": "@happychain/configs/tsconfig.base.json",
	"compilerOptions": {
		"baseUrl": "./lib",
		"paths": { "lib/*": ["./*"] }
	},
	"include": ["lib"]
}
