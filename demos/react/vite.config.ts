import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
    server: { port: 6002, strictPort: true },
    preview: { port: 6002, strictPort: true },
    plugins: [react()],
})
