import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8', // or 'v8' for native V8 coverage
            reporter: ['html', 'lcov'], // 'text', 'json', 'html', etc.
            include: ['lib/'], // Target files for coverage
            exclude: ['node_modules', 'test', 'dist'], // Exclude files
          },
        globals: true,
        environment: "node",
        setupFiles: "./vitest.setup.ts",
        testTimeout: 10000,
        hookTimeout: 30000,
        watch: false,
    },
})
