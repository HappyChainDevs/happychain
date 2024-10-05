import { type Config, defineConfig } from "@happychain/scripts"

// import project so that hot reloading/watching works
import "./happydom.ts"
import "./lib/index.ts"

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
