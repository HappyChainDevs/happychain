import { deployment } from "@happy.tech/contracts/boop/sepolia"
import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        define: {
            // Production Values -
            "import.meta.env": JSON.stringify({
                SUBMITTER_URL: process.env.SUBMITTER_URL || "https://submitter.happy.tech",
                RPC_URL: process.env.RPC_URL || "https://rpc.testnet.happy.tech",
                ENTRYPOINT: deployment.EntryPoint,
            }),
        },
    },
})
