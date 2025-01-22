import { defineConfig, inlineCssPlugin } from "@happychain/build"

export default defineConfig({
    bunConfig: {
        plugins: [inlineCssPlugin],
        define: {
            "import.meta.env.IFRAME_URL": process.env.IFRAME_URL as string,
        },
        external: ["@wagmi/core", "viem"],
    },
})
