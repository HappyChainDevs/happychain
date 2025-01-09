import type { Plugin } from "vite"
import pkg from "../../package.json" with { type: "json" }
import { shimCodeGen } from "./codegen.ts"
import { filter } from "./utils.ts"

/**
 * Plugin can run during both the 'build' or 'serve' commands, i.e. 'bun vite build' and 'bun vite'
 *
 * Injects familiar worker interface into the 'worker' file
 * however runs in the local context without any worker
 * as if you just imported the file directly.
 */
export function SharedWorkerShimPlugin(): Plugin {
    return {
        name: `${pkg.name}:shim`,
        enforce: "pre",
        transform(code: string, id: string) {
            if (!filter(id)) return
            return { code: shimCodeGen(code, id) }
        },
    }
}
