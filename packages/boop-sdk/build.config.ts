import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        define: {
            "import.meta.env": JSON.stringify({
                SUBMITTER_URL: process.env.SUBMITTER_URL,
            }),
        },
    },
})
