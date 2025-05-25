import sharedConfig from "@happy.tech/configs/vite.config"
import vue from "@vitejs/plugin-vue"
import { defineConfig, mergeConfig } from "vite"

// https://vitejs.dev/config/
export default mergeConfig(
    sharedConfig,
    defineConfig({
        server: { port: 6003 },
        preview: { port: 6003 },
        plugins: [vue()],
    }),
)
