import { defineConfig } from "../scripts/defineConfig.ts"

import "./happydom.ts"

// import project so that hot reloading/watching works
import "./lib/index.ts"

export default defineConfig([
    {
        cleanOutDir: true,
        tsConfig: "tsconfig.build.json",
        apiExtractorConfig: "api-extractor.json",
        bunConfig: {
            entrypoints: ["./lib/index.ts"],
            outdir: "./dist",
            minify: false,
            splitting: false,
            external: ["react", "react-dom", "@happychain/js"],
            sourcemap: "linked",
            naming: "[dir]/[name].es.[ext]",
        },
    },
])
