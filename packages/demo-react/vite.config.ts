import { resolve } from "node:path"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@happychain/react": resolve(__dirname, "../sdk-react/lib/index.ts"),
            "@happychain/reacjst": resolve(__dirname, "../sdk-vanillajs/lib/index.ts"),
        },
    },
})
