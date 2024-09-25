// Ensures window etc are defined, which is needed to import ./lib/index.ts.
import "./happydom.ts"

// This import ensures the build rerun on changes when run with `bun run --watch bundle.ts ...`
import "./lib/index.ts"

import { dependencies } from "./package.json"

const result = await Bun.build({
    root: ".",
    entrypoints: ["./lib/index.ts"],
    outdir: "./dist",
    minify: true,
    splitting: true,
    sourcemap: "linked",
    external: Object.keys(dependencies),
})

if (!result.success) {
    console.error("Build failed")
    for (const message of result.logs) {
        console.log(message)
    }
}
