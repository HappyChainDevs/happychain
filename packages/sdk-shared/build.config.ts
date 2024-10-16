import { defineConfig } from "@happychain/scripts"

export default defineConfig({
    tsConfig: "tsconfig.json",
    apiExtractorConfig: false,
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
    },
})
