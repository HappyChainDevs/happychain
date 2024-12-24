import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true, // Enables global `describe`, `it`, `expect`
        testTimeout: 30000,   
        environment: "node", // Use Node.js environment
        setupFiles: [], // Optional: add setup files if needed
    },
})
