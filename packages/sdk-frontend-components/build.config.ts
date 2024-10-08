import { type Config, defineConfig, inlineCssPlugin } from "@happychain/scripts"

export default defineConfig([
    {
        name: "index",
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
        },
    },
]) as Config[]
