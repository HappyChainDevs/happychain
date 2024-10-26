import { defineConfig } from "@happychain/build"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        external: ["react", "react-dom", "@happychain/js"],
    },
})
