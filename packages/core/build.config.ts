import { defineConfig, inlineCssPlugin } from "@happy.tech/happybuild"

export default defineConfig([
    {
        exports: ["."],
        bunConfig: {
            plugins: [inlineCssPlugin],
            define: {
                "import.meta.env.IFRAME_URL": process.env.IFRAME_URL as string,
            },
            external: ["@wagmi/core", "viem"],
        },
    },
    {
        exports: ["./wagmi"],
        apiExtractorConfig: "./api-extractor.wagmi.json",
        bunConfig: {
            plugins: [inlineCssPlugin],
            define: {
                "import.meta.env.IFRAME_URL": process.env.IFRAME_URL as string,
            },
            external: ["@happy.tech/core", "@wagmi/core", "viem"],
        },
    },
])
