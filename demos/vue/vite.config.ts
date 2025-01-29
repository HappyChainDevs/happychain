import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
    server: { port: 6003, strictPort: true },
    preview: { port: 6003, strictPort: true },
    plugins: [vue()],
})
