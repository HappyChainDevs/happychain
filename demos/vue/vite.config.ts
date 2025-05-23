import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
    envPrefix: ["HAPPY_"],
    server: { port: Number(process.env.DEMO_VUE_PORT) || 6003, strictPort: true },
    preview: { port: Number(process.env.DEMO_VUE_PORT) || 6003, strictPort: true },
    plugins: [vue()],
    build: {
        rollupOptions: {
            onwarn(warning, defaultHandler) {
                if (
                    // silence pesky Oxc
                    warning.code === "INVALID_ANNOTATION" &&
                    warning.message.includes("contains an annotation that Rollup cannot interpret")
                )
                    return // silence pesky annotations from wevm/ox
                defaultHandler(warning)
            },
        },
    },
})
