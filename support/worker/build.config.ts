import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig([
    {
        exports: ["."],
        bunConfig: {
            sourcemap: "inline",
            // The build here builds the plugin, not browser code. This makes it slightly leaner.
            target: "bun",
            packages: "external",
        },
    },
    {
        exports: [{ name: "./runtime", entrypoint: "./src/runtime.ts" }],
        name: "runtime",
        bunConfig: {
            sourcemap: "inline",
        },
    },
])
