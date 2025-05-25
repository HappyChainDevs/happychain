import sharedConfig from "@happy.tech/configs/vite.config"
import { defineConfig, mergeConfig } from "vite"

// https://vitejs.dev/config/
export default mergeConfig(
    sharedConfig,
    defineConfig({
        server: { port: 6001 },
        preview: { port: 6001 },
    }),
)
