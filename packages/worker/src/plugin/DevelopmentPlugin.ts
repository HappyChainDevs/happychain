import type { Plugin } from "vite"
import pkg from "../../package.json" with { type: "json" }
import { clientCodeGen, workerCodeGen } from "./codegen.ts"
import { filter } from "./utils.ts"

/**
 * Plugin runs during the 'serve' command, i.e. 'bun vite'
 *
 * This generates both client & server code during development bundling
 */
export function DevelopmentPlugin(): Plugin {
    return {
        name: `${pkg.name}:development`,
        apply: "serve",
        enforce: "pre",
        transform(code: string, id: string) {
            if (!filter(id)) return
            // In development, vite appends "?worker_file&type=module" to the worker files, which
            // are paths passed to a web worker constructor like `SharedWorker`.
            const isClient = !id.includes("worker_file")
            return { code: isClient ? clientCodeGen(code, id) : workerCodeGen(code, id) }
        },
    }
}
