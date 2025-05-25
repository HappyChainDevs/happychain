import { defineConfig, inlineCssPlugin } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        plugins: [inlineCssPlugin],
        external: ["@wagmi/core", "viem"],
    },
})
