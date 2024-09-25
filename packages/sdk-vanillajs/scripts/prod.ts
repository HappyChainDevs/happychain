import { join } from "node:path"
import { $ } from "bun"

const base = join(__dirname, "..")
const dist = join(base, "dist")

// clean
await $`rm -rf ${dist}`

// // build project
await await Bun.build({
    entrypoints: ["./lib/index.ts"],
    outdir: dist,
    splitting: false,
    sourcemap: "linked",
    format: "esm",
    minify: true,
    naming: "[dir]/[name].es.[ext]",
})

// // build declarations
await $`bunx tsc --build tsconfig.json --force`

// bundle declarations
// alternatively using programmatic api https://api-extractor.com/pages/setup/invoking/#invoking-from-a-build-script
const { stderr } =
    await $`bunx api-extractor run --local --verbose --typescript-compiler-folder=${require.resolve("typescript")}`.quiet()

const errors = stderr.toString()
if (errors.length) {
    console.warn(stderr.toString())
}

await $`mv dist/js.d.ts dist/index.d.ts`

// cleanup
await $`rm -rf dist/common`
await $`rm -rf dist/sdk-shared`
await $`rm -rf dist/sdk-vanillajs`

console.log("done")
