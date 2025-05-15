import { defineConfig, inlineCssPlugin } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        plugins: [inlineCssPlugin],
        define: {
            // When building, `import.meta.env` is not defined. We use it such that monorepo demos can
            // run in Vite (where `process.env` is not defined) without building. These definitions makes `import.meta.env`
            // variables also available when building.
            "import.meta.env.VITE_IFRAME_URL": process.env.VITE_IFRAME_URL as string,
            "import.meta.env.DEV": "false",
            "import.meta.env.MODE": "'production'",
        },
        external: ["@wagmi/core", "viem"],
    },
})
