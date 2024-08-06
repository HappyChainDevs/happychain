# Typescript Configs

Typescript configs to be shared between packages

1. first add to the packages package.json

```json
"devDependencies": {
    "@happychain/typescript-config": "workspace:^",
}
```

2. Install

```sh
pnpm install
```

3. add or update `tsconfig.json` with your preferred config

```json
// tsconfig.json
{
	"extends": "@happychain/typescript-config/tsconfig.vite-lib.json",
	"compilerOptions": {
		"baseUrl": "./lib",
		"paths": {
			"lib/*": ["./*"]
		}
	},
	"include": ["lib"]
}
```
