import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        external: ["react", "react-dom", "@happy.tech/core"],
    },
})
