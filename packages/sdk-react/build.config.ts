import { type Config, defineConfig } from "@happychain/scripts"

export default defineConfig({
    cleanOutDir: true,
    tsConfig: "tsconfig.build.json",
    apiExtractorConfig: "api-extractor.json",
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        outdir: "./dist",
        minify: true,
        splitting: false,
        external: ["react", "react-dom", "@happychain/js"],
        sourcemap: "linked",
        naming: "[dir]/[name].es.[ext]",
    },
}) as Config
