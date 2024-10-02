import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { BunPlugin } from "bun"

export const inlineCssPlugin: BunPlugin = {
    name: "Inlined CSS Loader Plugin",
    setup(builder) {
        builder.onResolve({ filter: /\.css\?inline$/ }, (args) => ({
            loader: "text",
            namespace: "inline",
            path: join(dirname(args.importer), args.path).replace("?inline", ""),
        }))
        builder.onLoad({ namespace: "inline", filter: /\.css/ }, (args) => {
            return {
                loader: "text",
                contents: readFileSync(args.path, "utf8"),
            }
        })
    },
}
