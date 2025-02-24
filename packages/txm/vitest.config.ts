import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: "./vitest.setup.ts",
        testTimeout: 10000,
        hookTimeout: 30000,
        watch: false,
    },
})
