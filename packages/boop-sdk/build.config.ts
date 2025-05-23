import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        define: {
            // Production Values -
            "import.meta.env": JSON.stringify({
                HAPPY_SUBMITTER_URL: process.env.HAPPY_SUBMITTER_URL,
                HAPPY_RPC_HTTP_URL: process.env.HAPPY_RPC_HTTP_URL,
                HAPPY_ENTRYPOINT: process.env.HAPPY_ENTRYPOINT,
            }),
        },
    },
})
