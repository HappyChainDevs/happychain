import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
    resolve: {
        alias: { "@happychain/js": resolve(__dirname, "../sdk-vanillajs/lib/index.ts") },
    },
})
