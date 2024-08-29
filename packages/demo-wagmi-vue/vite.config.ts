import { resolve } from "node:path"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            "@happychain/js": resolve(__dirname, "../sdk-vanillajs/lib/index.ts"),
        },
    },
})
