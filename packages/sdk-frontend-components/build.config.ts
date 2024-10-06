import { type Config, defineConfig, inlineCssPlugin } from "@happychain/scripts"
import pkg from "./package.json"

export default defineConfig([
    {
        name: ".",
        exports: ["."],
        bunConfig: {
            entrypoints: ["./lib/index.ts"],
            plugins: [inlineCssPlugin],
        },
    },
    {
        name: "preact",
        exports: ["./preact"],
        apiExtractorConfig: "api-extractor-preact.json",
        bunConfig: {
            entrypoints: ["./lib/badge.tsx"],
            external: ["preact"],
            plugins: [inlineCssPlugin],
            naming: "[dir]/preact.es.[ext]",
        },
    },
]) as Config[]
