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
        SharedWorkerPlugin({
            disabled: false,
            prodChunks: sharedWorkerChunkStrategy(),
        }),
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
                    ? [/\\.mocks$/]
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

/**
 * Chunking here is optional, but extracting the common runtime into a
 * shared resource allows us only load the runtime once, regardless of
 * how many shared workers we create. Extracting web3auth independently
 * will allow us to cache it separate from our code so we will only
 * need to bust this cache if the web3auth dependency itself is updated.
 * This can be advantageous due to its size, which is 2,000+kb at the
 * time of writing
 */
function sharedWorkerChunkStrategy() {
    return (id: string) => {
        // must be vendor if Web3Auth is vendored so that
        // it can be loaded first, _always_
        if (id.includes("web3auth.polyfill.ts")) {
            return "worker-web3auth-polyfill-chunk"
        }

        if (id.includes("@web3auth") || id.includes("@toruslabs")) {
            return "worker-web3auth-chunk"
        }

        if (id.includes("worker/dist/runtime.js")) {
            return "worker-happychain-chunk"
        }
    }
}
