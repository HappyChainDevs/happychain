import { defineConfig, inlineCssPlugin } from "@happy.tech/happybuild"

if (!process.env.HAPPY_IFRAME_URL || process.env.HAPPY_IFRAME_URL.includes("localhost")) {
    throw new Error(`${process.env.HAPPY_IFRAME_URL} is not a valid HAPPY_IFRAME_URL. It should be a production URL.`)
}

export default defineConfig({
    bunConfig: {
        define: {
            // When building, `import.meta.env` is not defined. We use it such that monorepo demos can
            // run in Vite (where `process.env` is not defined) without building. These definitions makes `import.meta.env`
            // variables also available when building.
            "import.meta.env.HAPPY_IFRAME_URL": process.env.HAPPY_IFRAME_URL as string,
            "import.meta.env.HAPPY_RPC_OVERRIDE": process.env.HAPPY_RPC_OVERRIDE || "''",
            "import.meta.env.PROD": "true",
            "import.meta.env.MODE": "'production'",
        },
        plugins: [inlineCssPlugin],
        external: ["@wagmi/core", "viem"],
    },
})
