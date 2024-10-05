import { type Config, defineConfig, inlineCssPlugin } from "@happychain/scripts"

export default defineConfig({
    cleanOutDir: true,
    tsConfig: "tsconfig.build.json",
    apiExtractorConfig: "api-extractor.json",
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        outdir: "./dist",
        minify: true,
        splitting: false,
        sourcemap: "linked",
        plugins: [inlineCssPlugin],
        naming: "[dir]/[name].es.[ext]",
    },
}) as Config
