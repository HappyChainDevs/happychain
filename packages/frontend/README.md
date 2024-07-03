# Frontend

See the [Makefile](./Makefile) for the available command to build, check code standards, etc...

## Misc

- Use types `Address`, `Hash` and `Hex` from Viem when appropriate!

## Dependencies

These are needed at runtime (although Next will take care of bundling them for us):

- `react` & `react-dom` — reactive frontend library
- `next` — web framework around React, providing build tools, hot reload, routing & code splitting
- `viem` & `wagmi` — for communicating with blockchains' JSON-RPC nodes, querying chain state.
  `wagmi` handles the React integration.
  - `@tanstack/react-query` is a peer dependency — handling querying & caching logic (not web3 specific)
- `jotai` — for state management
  - `jotai-devtools` — for debugging jotai state, supposedly tree-shakes in production builds 
- `@rainbow-me/rainbowkit` — for web3 wallet connection logic & UI (requires `wagmi`)
- `burner-connector` — burner wallet logic (requires `wagmi`, optinally `@rainbow-me/rainbowkit`)
- `daisyui` — component library for tailwindcss
- `tslib` — runtime library for typescript, to avoid duplicating helper functions in each file

## Dev Dependencies

- `typescript` — typescript compilation support
- `eslint` — javascript linting tool (use via `make lint` or `make check`, and `make lint-fix`)
  - NOTE: Eslint must not be updated to version 9 until Next.js supports it (currently: Next 14.2.3)
    - This will require migrating the eslint config to a new format 
  - `eslint-config-next` —  eslint config for use with Next.js
  - `@typescript-eslint/parser` — parser enabling eslint to lint Typescript files 
  - `@typescript-eslint/eslint-plugin` — Typescript rules for eslint
   `eslint-config-prettier` — disables eslint rules that conflict with prettier (see below)
- `tailwindcss` — a collection of css styles + a tool to generate CSS files that only include used styles,
   with peer dependencies `postcss` (CSS post-processing) and `autoprefixer` (postcss plugin that adds
   browser prefixes as needed (e.g. `-webkit-`))
- Typescript type definitions, for their respective packages
  - `@types/eslint`
  - `@types/node`
  - `@types/react`
  - `@types/react-dom`
- `prettier` — code formatter (use via `make format` and `make check`)
  - Configured via `.prettierrc.json` and `.prettierignore`
  - `prettier-plugin-tailwindcss` — prettier plugin for tailwindcss

## Dependencies to include if needed

- `clsx` — utility for conditionally including html class names

## Configuration Files

### `tsconfig.json`

Typescript configuration. Options are documented [here](https://www.typescriptlang.org/tsconfig).

- `target`: the Javascript version to compile to, using `es2022` as that is the most recent version
- `baseUrl`:  where to look for source files
- `paths`:  a set of path remappings/aliases
- `lib`:  standard JS libs to include, we want DOM access manipulation and built-in libraries
- `allowJs`: allow JS files to be imported
- `checkJs`: performs typescript checking (whenever possible) on JS files
- `skipLibCheck`: skip checking of type declaration files (.d.ts)
  - It would be better to disable this (do the check) to avoid conflicting type definitions, but the
    build breaks with some library we use (at least wagmi).
- `strict`: enable a series of stricter checks
- `alwaysStrict`: emit Javascript `use strict` for every file
- `forceConsistentCasingInFileNames`: forces casing of imports to match file on disk
- `noEmit`: do not emit output (e.g. compiled) files (to let another tool like Next do it), just do
  checking
- `incremental`: support incremental compilation
- `importHelpers`: enable import of helper functions from tslib, to avoid duplicating them in each
  file, this requires `tslib` to be installed
- `module`: module system to use in generated files —
  since we're web based, we use `esnext`, the latest version of the standard, and mandatory for use
  with Next.js
  - Setting this to `esnext` also means `require` is in theory not allowed in the code, but it is
    allowed in practice, handled by the Next.js bundler.
  - In `package.json`, `"type": "module"` should be specified to signify `.js` files are to be
    interpreted as ES modules.
- `moduleResolution`: how to resolve module imports, we use `node10`, which is required by Next.js —
  this only supports CommonJS `require`, but `import` can still be used, it is handled by the NextJS
  bundler
- `esModuleInterop`: enable compat with ES6 module spec, but also with non-conforming libraries
- `resolveJsonModule`: allow importing JSON files
- `isolatedModules`: makes tells TypeScript warn you if writing code that can't be interpreted by
  single-file transpilation processes (like some bundlers)
- `jsx`: set to `preserve` to emit `.jsx` file with the jsx syntax unchanged 
- `include`: files to include in the compilation — current values are set by default by Next.js
- `exclude`: files to exclude from the compilation — current values are set by default by Next.js

IDE Note: In IntelliJ, you need to configure code style for Javascript and Typescript not to
automatically add the `.js` extensions to imports.

### `.eslintrc.cjs`

Note: For use with Next, this has to be a CJS module, not an ESM module, hence the extension.

[Setup instructions for Typescript
support](https://typescript-eslint.io/getting-started/legacy-eslint-setup/) that we followed.

- `extends`: basic rule sets to use. We use `next/core-web-vitals` as recommended by Next.js (this
  includes rules from the `eslint-config-next` package, which are those you would get from
  extending `next`), and `plugin:@typescript-eslint/recommended` for Typescript support.
- The `parser`, `parseOptions` and `plugins` settings are also set up for Typescript support.
  - `sourceType` and `ecmaVersion` use the default values, but we include them to be explicit.
- `root`: set to true to use this eslint config file and stop looking for other config files in
  parent directories.
- `ignorePatterns`: exclude files from linting.
- `rules`: a way to add or disable rules.
  - We disable:
    - `@typescript-eslint/no-unsafe-argument` — to enable passing `any` arguments, useful with some
      libraries doing type-level shenanigans like wagmi.
    - `@typescript-eslint/no-explicit-any` — to allow explicit `any` types for the same reason.
    - `@typescript-eslint/restrict-template-expressions` — to allow template strings to interpolate
       objects, not only strings.
    - `@typescript-eslint/ban-ts-comment` — to allow explicit `@ts` comment to override the checking
       behaviour. This is again sometimes useful with finicky libraries (e.g. `circomlibjs`) or when
       doing javascript magic like overriding built-in functions.
    - `react/no-unescaped-entites` — to let you write e.g. `return <div>You're welcome</div>` in
       React without having to escape the quote (& same for other characters). 
    - `no-unused-var` — to be replaced by a customization of `@typescript-eslint/no-unused-vars`
       which allows unused variable if they start with an underscore. This is often useful for
       development and to document parameters that are unused now but might become used later.
  - We configure the import sorting:
    - `@typescript-eslint/no-restricted-imports` — forbid relative imports, we want all of our imports
       to be absolute, using remappings like `src/` set up using `paths` in `tsconfig.json`.
    - `import/first` — makes sure all the imports are at the top of the file
    - `import/newline-after-import` — insure a newline is present after the import list
    - `import/no-duplicates` — enforces a single import per imported file
    - `import/newline-after-import` — defines import grouping & their relative ordering

### `nextjs.config.mjs`

This file is not present currently, as we are fine using the default configuration.

If customization is needed, option details can be found
[here](https://nextjs.org/docs/api-reference/next.config.js/introduction).