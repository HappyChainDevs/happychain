import { dirname, join } from "node:path"
import { $ } from "bun"

const base = join(__dirname, "..")
const dist = join(base, "dist")

// clean
await $`rm -rf ${dist}`
import type { BunPlugin } from "bun"

const inlineCssLoader: BunPlugin = {
    name: "Inlined CSS Loader",
    setup(builder) {
        builder.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
            path: join(dirname(args.importer), args.path).replace("?inline", ""),
        }))
    },
}
// // build project
const library = await Bun.build({
    entrypoints: ["./lib/index.ts"],
    outdir: dist,
    splitting: false,
    sourcemap: "linked",
    external: [], //internalized web-component
    format: "esm",
    minify: true,
    naming: "[dir]/[name].es.[ext]",
    plugins: [inlineCssLoader],
    loader: { ".css": "text" },
})
if (!library.success) {
    console.log(...library.logs)
}

//  Generate Preact specific Component
const preactBuild = await Bun.build({
    entrypoints: ["./lib/badge.tsx"],
    outdir: dist,
    splitting: false,
    sourcemap: "linked",
    external: ["preact"], // simple preact component
    format: "esm",
    minify: true,
    naming: "[dir]/preact.es.[ext]", // TODO: rename to preact.js and generate react.js also
    plugins: [inlineCssLoader],
    loader: { ".css": "text" },
})
if (!preactBuild.success) {
    console.log(...preactBuild.logs)
}
// build declarations
await $`bunx tsc --build tsconfig.json --force`

// bundle declarations
// alternatively using programmatic api https://api-extractor.com/pages/setup/invoking/#invoking-from-a-build-script
const { stderr } =
    await $`bunx api-extractor run --local --verbose --typescript-compiler-folder=${require.resolve("typescript")}`.quiet()

const errors = stderr.toString()
if (errors.length) {
    console.warn(stderr.toString())
}

await $`mv dist/ui.d.ts dist/index.d.ts`

// cleanup
await $`rm -rf dist/sdk-frontend-components`

console.log("done")
