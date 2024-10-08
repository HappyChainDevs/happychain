/// <reference types="vitest" />
import { join, resolve } from "node:path"
import { SharedWorkerPlugin } from "@happychain/vite-plugin-shared-worker"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    optimizeDeps: {
        exclude: ["@happychain/vite-plugin-shared-worker"],
    },
    server: { port: 5160 },
    plugins: [
        nodePolyfills({ globals: { Buffer: true } }), // required for web3Auth
        TanStackRouterVite(),
        react({ babel: { presets: ["jotai/babel/preset"] } }),
        SharedWorkerPlugin(),
    ],
    resolve: {
        alias: {
            "@happychain/firebase-web3auth-strategy": resolve(
                join(__dirname, "../sdk-firebase-web3auth-strategy/lib/index.ts"),
            ),
        },
    },
    build: {
        rollupOptions: {
            external:
                mode === "production"
                    ? []
                    : ["react", "viem", "@web3auth/base", "@web3auth/ethereum-mpc-provider", "@web3auth/mpc-core-kit"],
        },
    },

    test: {
        environment: "happy-dom",
    },
}))
