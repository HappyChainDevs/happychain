import { defineConfig } from "@happychain/scripts"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        external: ["react", "react-dom", "@happychain/js"],
    },
})
