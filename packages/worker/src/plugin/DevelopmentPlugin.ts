import type { Plugin } from "vite"
import pkg from "../../package.json"
import { clientCodeGen, workerCodeGen } from "./codegen"
import { filter } from "./utils"

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
