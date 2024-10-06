# Configs

Configurations shared accross packages in the HappyChain monorepo.

## Install

Add to your packages `package.json`

```jsonc
{
     // ... other properties
    "devDependencies": {
        "@happychain/configs": "workspace:^",
    }
}
```

```sh
bun install
```

## Biome Configs

In your package create a `biome.jsonc` with the following properties:

```jsonc
{
    "$schema": "../../node_modules/@biomejs/biome/configuration_schema.json",
    "extends": ["../../packages/configs/biome.jsonc"]
}
```

To customize, simply extend the config (object properties are merged, other types are overriden):

```jsonc
{
    "$schema": "../../node_modules/@biomejs/biome/configuration_schema.json",
    "extends": ["../../packages/configs/biome.jsonc"]
    // will be merged with `files` in the extended config
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

Add or update `tsconfig.json` with your preferred config `tsconfig.*.json`. You need the `extends`
and `include` property, then you can extend the config (object properties are merged, other types
are overriden):

```jsonc
{
	"extends": "@happychain/configs/tsconfig.base.json",
	// will be merged with `compilerOptions` in the extended config
	"compilerOptions": {
		"baseUrl": "./lib",
		"paths": { "lib/*": ["./*"] }
	},
	"include": ["lib"]
}
