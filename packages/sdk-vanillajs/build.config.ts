import { defineConfig, inlineCssPlugin } from "@happychain/scripts"

export default defineConfig({
    bunConfig: {
        minify: false,
        entrypoints: ["./lib/index.ts"],
        plugins: [inlineCssPlugin],
    },
})
