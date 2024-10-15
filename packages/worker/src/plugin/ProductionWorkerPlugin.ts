import type { Plugin } from "vite"
import pkg from "../../package.json"
import { workerCodeGen } from "./codegen"
import { filter } from "./utils"

export function ProductionWorkerPlugin(): Plugin {
    return {
        name: `${pkg.name}:worker`,
        apply: "build",
        enforce: "pre",
        transform(code: string, id: string) {
            if (!filter(id)) return
            return { code: workerCodeGen(code, id) }
        },
    }
}
