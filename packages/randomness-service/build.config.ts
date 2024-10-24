import { defineConfig } from "@happychain/scripts"
import { buildConfig } from "@happychain/transaction-manager"

export default defineConfig([
    {
        tsConfig: "tsconfig.json",
        bunConfig: {
            entrypoints: ["./src/index.ts"],
            minify: false,
            target: "node",
            // The transaction-manager package depends on mikro-orm, which relies on dynamic imports like "pg" that are not
            // actually installed. Therefore, when bundling the package, we need to instruct bun to ignore them.
            external: [...buildConfig.default[0].bunConfig.external],
        },
    },
])
