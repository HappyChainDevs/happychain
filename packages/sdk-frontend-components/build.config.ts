import { defineConfig, inlineCssPlugin } from "@happychain/scripts"
import pkg from "./package.json"

export default defineConfig([
    {
        tsConfig: "tsconfig.build.json",
        apiExtractorConfig: "api-extractor.json",
        types: { "./lib/index.ts": pkg.exports["."].types },
        bunConfig: {
            entrypoints: ["./lib/index.ts"],
            outdir: "./dist",
            minify: false,
            splitting: false,
            external: ["@happychain/js"],
            plugins: [inlineCssPlugin],
            sourcemap: "linked",
            naming: "[dir]/[name].es.[ext]",
        },
    },

    {
        tsConfig: "tsconfig.build.json",
        apiExtractorConfig: "api-extractor-preact.json",
        types: { "./lib/badge.tsx": pkg.exports["./preact"].types },
        bunConfig: {
            entrypoints: ["./lib/badge.tsx"],
            outdir: "./dist",
            minify: false,
            splitting: false,
            external: ["preact", "@happychain/js"],
            sourcemap: "linked",
            plugins: [inlineCssPlugin],
            naming: "[dir]/preact.es.[ext]",
        },
    },
])
