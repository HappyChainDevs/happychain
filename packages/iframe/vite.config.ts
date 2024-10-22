/// <reference types="vitest" />
import { SharedWorkerPlugin } from "@happychain/worker"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    server: { port: 5160 },
    preview: { port: 5160 },
    plugins: [
        TanStackRouterVite(),
        react({ babel: { presets: ["jotai/babel/preset"] } }),
        SharedWorkerPlugin({ disabled: false }),
    ],
    resolve: {
        alias: {
            // https://web3auth.io/docs/troubleshooting/vite-issues
            crypto: "empty-module",
            http: "empty-module",
            https: "empty-module",
            zlib: "empty-module",
        },
    },

    build: {
        rollupOptions: {
            external:
                command === "build"
                    ? []
                    : [
                          "react",
                          "viem",
                          "@web3auth/base",
                          "@web3auth/ethereum-mpc-provider",
                          "@web3auth/mpc-core-kit",
                          /\\.mocks$/,
                      ],
        },
    },
    test: {
        environment: "happy-dom",
    },
}))
