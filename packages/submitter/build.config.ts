import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig([
    {
        exports: ["."],
        // TODO ?
        // apiExtractorConfig: "api-extractor.json",
        rollupTypes: false,
        bunConfig: {
            target: "bun",
            minify: false,
        },
    },
    {
        exports: ["./client"],
        // TODO ?
        // apiExtractorConfig: "api-extractor-client.json",
        rollupTypes: false,
        bunConfig: {
            minify: false,
        },
    },
])
