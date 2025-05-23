import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
    envPrefix: ["HAPPY_"],
    server: { port: Number(process.env.DEMO_REACT_PORT) || 6002, strictPort: true },
    preview: { port: Number(process.env.DEMO_REACT_PORT) || 6002, strictPort: true },
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
