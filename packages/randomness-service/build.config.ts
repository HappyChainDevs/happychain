import { defineConfig } from "@happychain/scripts"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./src/index.ts"],
        minify: false,
        target: "node",
    },
})
