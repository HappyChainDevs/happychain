import { type Config, defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        apiExtractorConfig: false,
        checkTypes: false,
        exports: ["."],
        bunConfig: {
            entrypoints: ["./src/index.ts"],
            sourcemap: "none",
            outdir: "dist",
            target: "bun",
            external: ["mlly"],
        },
    },
    {
        exports: ["./runtime"],
        apiExtractorConfig: false,
        checkTypes: false,
        bunConfig: {
            entrypoints: ["./src/runtime/index.ts"],
            sourcemap: "none",
        },
    },
]) as Config
