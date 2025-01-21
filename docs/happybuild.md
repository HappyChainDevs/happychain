# HappyBuild

HappyBuild is our custom ad-hoc build system to manage building and bundling within the monorepo.
It turns out that isn't something that has easy solutions (though see [turborepo](https://turbo.build)).

In our monorepo, everything is driven by makefiles at the top level and in each package. Usage of
the top-level makefile (which is usually all you need) is detailed in the [top-level
README](/README.md).

We then have two co-existing build systems:
- HappyBuild itself, which is used to build libraries. It is implemented as a set of Typescript files
  in the `happybuild` package, and is used to coordinate multiple tools including `tsc`, `bun` and
  `api-extractor`.
- Vite, which is used to build web apps.

## Configuration

HappyBuild is configured in each package via the `build.config.ts` file.

A reference of the configuration options can be found in the
[define.ts](/packages/happybuild/lib/config/define.ts) and
[types.ts](/packages/happybuild/lib/config/types.ts) files of the `happybuild` package.

Here is an example of a complex `build.config.ts` (from the `@happychain/worker` package):

```typescript
import { defineConfig } from "@happychain/build"

export default defineConfig([
        {
        exports: ["."],
        bunConfig: {
            sourcemap: "inline",
            target: "bun",
            packages: "external",
        },
    },
    {
        exports: [{ name: "./runtime", entrypoint: "./src/runtime/index.ts" }],
        bunConfig: {
            sourcemap: "inline",
        },
    },
])
```

Each file can have multiple configs under `defineConfig`, though most packages only have one.

Defining multiple configs is useful when the package exports multiple outputs that need to be
compiled using different settings.

Each config has a display name, though that is usually only specified when there are multiple config
in a single package.

The major part of the configuration is the `bunConfig` object, which is directly passed to `bun`,
after automatically filling in some additional details.

The most important part of the config is the `exports` field. This defines the list of `exports` (as
specified in `package.json`) that should be built. If not specified, all exports are built.

One important thing for the `bun` bundler is the entrypoint file for every export. This is
automatically derived from the name of the exported file in package.json (e.g.
`./dist/migrate.es.js` → `./lib/migrate.ts`). This translation uses the `src` or `lib` if one
exists. If both exist, you'll have to specify as the `defaultSourceRoot` option. The `dist` part is
also configurable as `exportDir`.

You can also explicitly specify the entrypoint (in case its name is different from the exported
file), as we do in the second config from the example above.
