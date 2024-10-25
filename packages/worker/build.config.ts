import { defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        exports: ["."],
        checkExports: false,
        bunConfig: {
            entrypoints: ["./src/index.ts"],
            sourcemap: "inline",
            // The build here builds the plugin, not browser code. This makes it slightly leaner.
            target: "bun",
            packages: "external",
        },
    },
    {
        exports: ["./runtime"],
        checkExports: false,
        bunConfig: {
            entrypoints: ["./src/runtime/index.ts"],
            sourcemap: "inline",
        },
    },
])
