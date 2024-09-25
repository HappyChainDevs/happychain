// Ensures window etc are defined, which is needed to import ./lib/index.ts.
import "./happydom.ts"
// Ensures the build rerun on changes when run with `bun run --watch bundle.ts ...`
import "./lib/index.ts"

import { bundle } from "../configs/bundle.ts"

await bundle({
    minify: false,
})
