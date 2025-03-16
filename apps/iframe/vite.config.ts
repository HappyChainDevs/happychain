import { SharedWorkerPlugin } from "@happy.tech/worker"
/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import z from "zod"

const envConfigSchema = z.object({
    VITE_BUNDLER_RPC_URL: z.string(),
    VITE_FIREBASE_API_KEY: z.string(),
    VITE_FIREBASE_AUTH_DOMAIN: z.string(),
    VITE_FIREBASE_PROJECT_ID: z.string(),
    VITE_FIREBASE_STORAGE_BUCKET: z.string(),
    VITE_FIREBASE_MESSAGE_SENDER_ID: z.string(),
    VITE_FIREBASE_APP_ID: z.string(),
    VITE_WEB3AUTH_CLIENT_ID: z.string(),
    VITE_WEB3AUTH_NETWORK: z.string(),
    VITE_WEB3AUTH_VERIFIER: z.string(),
})

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), "")
    const validateConfig = envConfigSchema.safeParse(env)
    if (validateConfig.error) {
        console.error(validateConfig.error.errors)
        process.exit(1)
    }
    return {
        optimizeDeps: {
            // Vite seems unable to properly optimize shared-workers with code-gen when switching
            // between branches.
            exclude: command === "serve" ? ["@happy.tech/worker"] : [],
        },
        server: { port: 5160, strictPort: true },
        preview: { port: 5160, strictPort: true },
        plugins: [
            tailwindcss(),
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
    }
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
        if (id.includes("web3auth.polyfill") || id.includes("@web3auth") || id.includes("@toruslabs")) {
            return "worker-web3auth-chunk"
        }
        if (id.includes("worker/dist/runtime")) {
            return "worker-happychain-chunk"
        }
        return undefined
    }
}
