import { type Config, defineConfig, inlineCssPlugin } from "@happychain/scripts"
import pkg from "./package.json"

export default defineConfig([
    {
        name: ".",
        types: { "./lib/index.ts": pkg.exports["."].types },
        bunConfig: {
            entrypoints: ["./lib/index.ts"],
            plugins: [inlineCssPlugin],
        },
    },
    {
        name: "preact",
        apiExtractorConfig: "api-extractor-preact.json",
        types: { "./lib/badge.tsx": pkg.exports["./preact"].types },
        bunConfig: {
            entrypoints: ["./lib/badge.tsx"],
            external: ["preact"],
            plugins: [inlineCssPlugin],
            naming: "[dir]/preact.es.[ext]",
        },
    },
]) as Config[]
