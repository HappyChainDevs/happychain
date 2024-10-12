import { type Config, defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        exports: ["."],
        checkExports: false,
        bunConfig: {
            entrypoints: ["./src/index.ts"],
            sourcemap: "none",
            target: "bun",
            external: ["mlly"],
        },
    },
    {
        exports: ["./runtime"],
        checkExports: false,
        bunConfig: {
            entrypoints: ["./src/runtime/index.ts"],
            sourcemap: "none",
        },
    },
]) as Config
