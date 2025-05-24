/**
 * This file defines a shared base configuration for all our webapps (iframe and demos).
 */

import { defineConfig } from "vite"

// Allowed Hosts is a comma-separated list of hostnames or IP addresses that the Vite dev server
// will accept connections from. It is not needed in most cases, but is required when testing
// across multiple devices on the same network.
const allowedHosts =
    import.meta.env?.NODE_ENV === "development" &&
    import.meta.env.ALLOWED_SERVER_HOSTS?.split(", ").map((a: string) => a.trim())
if (allowedHosts?.length) console.log("\nVite Allowing access from hosts:", allowedHosts)
const serverHostConfig = allowedHosts?.length ? { host: true, allowedHosts: allowedHosts } : {}

export default defineConfig({
    // We use strict ports for more reliable & easier demo setups
    // and easier interactions between apps
    server: { strictPort: true, ...serverHostConfig },
    preview: { strictPort: true },
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
