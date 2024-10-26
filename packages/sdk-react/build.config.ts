import { defineConfig } from "@happychain/build"

export default defineConfig({
    bunConfig: {
        external: ["react", "react-dom", "@happychain/js"],
    },
})
