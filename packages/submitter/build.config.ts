import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig([
    {
        exports: ["."],
        // apiExtractorConfig: "api-extractor.json",
        rollupTypes: false,
        bunConfig: {
            target: "bun",
            minify: false,
        },
    },
    {
        exports: ["./client"],
        // apiExtractorConfig: "api-extractor-client.json",
        rollupTypes: false,
        bunConfig: {
            minify: false,
        },
    },
])
