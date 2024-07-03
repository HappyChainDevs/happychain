import { defineConfig } from "@wagmi/cli"
import { foundry, react } from "@wagmi/cli/plugins"

export default defineConfig({
    out: "src/generated.ts",
    contracts: [],
    plugins: [
        react(),
        foundry({
            project: "../contracts",
            include: ["Main.sol/Main.json"],
        }),
    ],
})
