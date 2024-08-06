# Prettier Configs

Prettier configs to be shared between packages

1. first add to the packages package.json

```json
"devDependencies": {
    "@happychain/prettier-config": "workspace:^",
}
```

2. Install

```sh
pnpm install
```

3. add a `.prettier.js` with your preferred config

```js
// .prettierrc.js
import prettierConfig from '@happychain/prettier-config/.prettierrc.js'

/** @type {import("prettier").Options} */
export default {
    ...prettierConfig,
}
```
