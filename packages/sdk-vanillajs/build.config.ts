import { defineConfig, inlineCssPlugin } from "@happychain/build"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        plugins: [inlineCssPlugin],
        define: {
            "import.meta.env.IFRAME_URL": process.env.IFRAME_URL as string,
        },
    },
})
