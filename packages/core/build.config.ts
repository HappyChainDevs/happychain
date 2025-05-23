import { defineConfig, inlineCssPlugin } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        plugins: [inlineCssPlugin],
        define: {
            "import.meta.env.HAPPY_IFRAME_URL": process.env.HAPPY_IFRAME_URL as string,
        },
        external: ["@wagmi/core", "viem"],
    },
})
