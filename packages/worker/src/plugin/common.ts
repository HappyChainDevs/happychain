// packages/worker/src/plugin/common.ts
import type { Plugin } from "vite"
import pkg from "../../package.json" with { type: "json" }
import { filter } from "./utils.ts"

export function createPlugin(
    name: string,
    apply: "build" | "serve",
    transformFn: (code: string, id: string) => string,
): Plugin {
    return {
        name: `${pkg.name}:${name}`,
        apply,
        enforce: "pre",
        transform(code: string, id: string) {
            if (!filter(id)) return
            return { code: transformFn(code, id) }
        },
    }
}
