import type { Plugin } from "vite"
import pkg from "../../package.json"
import { ProductionWorkerPlugin } from "./ProductionWorkerPlugin"
import { clientCodeGen } from "./codegen"
import { filter } from "./utils"

export function ProductionClientPlugin(): Plugin {
    return {
        name: `${pkg.name}:client`,
        apply: "build",
        enforce: "pre",
        config() {
            return {
                // inject production worker plugin
                worker: { format: "es", plugins: () => [ProductionWorkerPlugin()] },
            }
        },
        transform(code: string, id: string) {
            if (!filter(id)) return
            return { code: clientCodeGen(code, id) }
        },
    }
}
