import type { Plugin } from "vite"
import { workerCodeGen } from "./codegen"
import { filter } from "./utils"

export function ProductionWorkerPlugin(): Plugin {
    return {
        name: "@happychain/vite-plugin-sharedworker:worker",
        apply: "build",
        enforce: "pre",
        transform(code: string, id: string) {
            if (!filter(id)) return

            return { code: workerCodeGen(code, id) }
        },
    }
}
