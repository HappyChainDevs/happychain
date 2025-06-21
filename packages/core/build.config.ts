import { defineConfig, inlineCssPlugin } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        define: {
            // Inline environment variable definition when building — they would otherwise not be available.
            // In dev, the environment variables from the importing monorepo package are used instead.
            // (This is unfortunate, we would rather read from this package's `.env` file but this is not trivially achievable.)
            "import.meta.env.HAPPY_IFRAME_URL": process.env.HAPPY_IFRAME_URL as string,
            "import.meta.env.HAPPY_RPC_OVERRIDE": process.env.HAPPY_RPC_OVERRIDE || "''",
            "import.meta.env.PROD": "true",
            "import.meta.env.MODE": "'production'",
        },
        plugins: [inlineCssPlugin],
        external: ["@wagmi/core", "viem"],
    },
})
