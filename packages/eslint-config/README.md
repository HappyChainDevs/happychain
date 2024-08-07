# ESLint Configs

Eslint configs to be shared between packages

1. first add to the packages package.json

```json
"devDependencies": {
    "@happychain/eslint-config": "workspace:^",
}
```

2. Install

```sh
pnpm install
```

3. add a `.eslintrc.cjs` with your preferred config

```js
// .eslintrc.cjs
/** @type {import("eslint").Linter.Config} */
module.exports = {
    root: true,
    extends: ['@happychain/eslint-config/vite.cjs'], // vite.cjs, next.cjs
    parser: '@typescript-eslint/parser',
}
```
