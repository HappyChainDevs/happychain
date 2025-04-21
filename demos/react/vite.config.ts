import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
    server: { port: 6002, strictPort: true },
    preview: { port: 6002, strictPort: true },
    plugins: [react()],
    build: {
        rollupOptions: {
            onwarn(warning, defaultHandler) {
                if (
                    warning.code === "INVALID_ANNOTATION" &&
                    warning.message.includes("contains an annotation that Rollup cannot interpret")
                )
                    return // silence pesky annotations from wevm/ox
                defaultHandler(warning)
            },
        },
    },
})
