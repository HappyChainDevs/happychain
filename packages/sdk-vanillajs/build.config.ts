import { defineConfig, inlineCssPlugin } from "@happychain/scripts"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        plugins: [inlineCssPlugin],
    },
})
