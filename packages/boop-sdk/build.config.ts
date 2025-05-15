import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        define: {
            // Production Values
            "import.meta.env.RPC_URL": process.env.RPC_URL || "",
            "import.meta.env.SUBMITTER_URL": process.env.SUBMITTER_URL || "",
            "import.meta.env.DEV": "false",
            "import.meta.env.MODE": "'production'",
        },
    },
})
