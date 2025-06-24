/**
 * This file defines a shared base configuration for all our webapps (iframe and demos).
 */

import { resolve } from "node:path"
import { defineConfig, loadEnv } from "vite"

// Comma-separated list of hosts (IP addresses or domains) which are allowed to access this service. (Optional)
// If empty, everyone is allowed.
// This can be used to safely expose a local service to the internet, our main use case being testing on mobile devices.
const allowedHosts = import.meta.env?.ALLOWED_HOSTS?.split(", ").map((a: string) => a.trim())
if (allowedHosts?.length) console.log("\nVite Allowing access from hosts:", allowedHosts)
const serverHostConfig = allowedHosts?.length ? { host: true, allowedHosts: allowedHosts } : {}

export default defineConfig({
    // Strict port: use the exact port we specify.
    // Without it, connection between apps (e.g. a demo and the iframe) can break.
    server: { strictPort: true, ...serverHostConfig },
    preview: { strictPort: true },
    define: (() => {
        if (process.cwd().includes("iframe")) return {}
        // For demos & docs: load the @happy.tech/core .env file.
        // This is needed during dev as core won't be built and won't read its .env file.
        const env = loadEnv("" /* no mode */, resolve("../../packages/core"), "HAPPY_")
        return Object.fromEntries(Object.entries(env).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]))
    })(),
    build: {
        rollupOptions: {
            onwarn(warning, defaultHandler) {
                if (
                    warning.code === "INVALID_ANNOTATION" &&
                    warning.message.includes("contains an annotation that Rollup cannot interpret")
                ) {
                    return // silence pesky annotations from wevm/ox
                }
                defaultHandler(warning)
            },
        },
    },
})
