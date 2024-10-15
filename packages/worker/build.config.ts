import { type Config, defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        exports: ["."],
        checkExports: false,
        bunConfig: {
            entrypoints: ["./src/index.ts"],
            sourcemap: "inline",
            target: "bun",
            external: ["mlly"],
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
]) as Config
