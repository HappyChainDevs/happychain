import sharedConfig from "@happy.tech/configs/vite.config.ts"
import react from "@vitejs/plugin-react-swc"
import { defineConfig, mergeConfig } from "vite"

// https://vitejs.dev/config/
export default mergeConfig(
    sharedConfig,
    defineConfig({
        server: { port: 6002 },
        preview: { port: 6002 },
        plugins: [react()],
    }),
)
