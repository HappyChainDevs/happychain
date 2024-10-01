import { dirname, join } from "node:path"
import type { BunPlugin } from "bun"
import { defineConfig } from "../scripts/defineConfig.ts"

const inlineCssLoader: BunPlugin = {
    name: "Inlined CSS Loader",
    setup(builder) {
        builder.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
            path: join(dirname(args.importer), args.path).replace("?inline", ""),
        }))
    },
}

export default defineConfig({
    cleanOutDir: false,
    tsConfig: "tsconfig.build.json",
    apiExtractorConfig: "api-extractor.json",
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        outdir: "./dist",
        minify: false,
        splitting: false,
        sourcemap: "linked",
        plugins: [inlineCssLoader],
        naming: "[dir]/[name].es.[ext]",
        loader: { ".css": "text" },
    },
})
