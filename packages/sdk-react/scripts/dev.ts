import { join } from "node:path"
import { $ } from "bun"

const base = join(__dirname, "..")
const dist = join(base, "dist")

await $`rm -rf ${dist}`
await $`mkdir ${dist}`

await $`ln -s ${base}/lib/index.ts ${base}/dist/index.es.js`
await $`ln -s ${base}/lib/index.ts ${base}/dist/index.d.ts`
