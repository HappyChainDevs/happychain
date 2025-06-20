/// <reference types="vitest" />

import sharedConfig from "@happy.tech/configs/vite.config"
import { SharedWorkerPlugin } from "@happy.tech/worker"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, mergeConfig } from "vite"
import type { ViteUserConfig } from "vitest/config"
import z from "zod"

const DEPL = process.env.VITE_DEPLOYMENT || "PROD"

const envConfigSchema = z.object({
    VITE_DEPLOYMENT: z.enum(["LOCAL", "STAGING", "PROD"]),
    VITE_SUBMITTER_URL: z.string(),
    VITE_TURNSTILE_SITEKEY: z.string(),
    VITE_FAUCET_ENDPOINT: z.string(),
    [`VITE_FIREBASE_API_KEY_${DEPL}`]: z.string(),
    [`VITE_FIREBASE_AUTH_DOMAIN_${DEPL}`]: z.string(),
    [`VITE_FIREBASE_PROJECT_ID_${DEPL}`]: z.string(),
    [`VITE_FIREBASE_STORAGE_BUCKET_${DEPL}`]: z.string(),
    [`VITE_FIREBASE_MESSAGE_SENDER_ID_${DEPL}`]: z.string(),
    [`VITE_FIREBASE_APP_ID_${DEPL}`]: z.string(),
    [`VITE_WEB3AUTH_CLIENT_ID_${DEPL}`]: z.string(),
    [`VITE_WEB3AUTH_NETWORK_${DEPL}`]: z.enum(["sapphire_devnet", "sapphire_mainnet"]),
    [`VITE_WEB3AUTH_VERIFIER_${DEPL}`]: z.string(),
})

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), "")
    const validateConfig = envConfigSchema.safeParse(env)
    if (validateConfig.error) {
        console.error(validateConfig.error.errors)
        process.exit(1)
    }

    return mergeConfig(sharedConfig, {
        optimizeDeps: {
            // Vite seems unable to properly optimize shared-workers with code-gen when switching
            // between branches.
            exclude: command === "serve" ? ["@happy.tech/worker"] : [],
        },
        define: {
            // TODO tmp until we transition VITE_ prefix over the HAPPY_
            "import.meta.env.HAPPY_RPC_OVERRIDE": JSON.stringify(env.HAPPY_RPC_OVERRIDE),
        },
        server: { port: 5160 },
        preview: { port: 5160 },
        plugins: [
            tanstackRouter({
                target: "react",
                autoCodeSplitting: true,
                verboseFileRoutes: true,
            }),
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
                url: "empty-module",
                zlib: "empty-module",
                stream: "empty-module",
            },
        },

        build: {
            rollupOptions: {
                external: [/\\.mocks$/],
            },
        },
        test: {
            environment: "happy-dom",
        },
    } satisfies ViteUserConfig)
})

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
        if (id.includes("polyfill") || id.includes("@web3auth") || id.includes("@toruslabs")) {
            return "worker-web3auth-chunk"
        }
        if (id.includes("worker/dist/runtime")) {
            return "worker-happychain-chunk"
        }
        return undefined
    }
}
