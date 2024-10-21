import { defineConfig } from "@happychain/scripts"
import transactionManagerBuildConfig from "@happychain/transaction-manager/build.config"

export default defineConfig([
    {
        bunConfig: {
            entrypoints: ["./src/index.ts"],
            minify: false,
            target: "node",
            external: [...transactionManagerBuildConfig[0].bunConfig.external],
        },
    },
])
