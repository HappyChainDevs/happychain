import type { Plugin } from "vite"
import { clientCodeGen, workerCodeGen } from "./codegen"
import { filter } from "./utils"

export function DevelopmentPlugin(): Plugin {
    return {
        name: "@happychain/vite-plugin-sharedworker:development",
        apply: "serve",
        enforce: "pre",
        transform(code: string, id: string) {
            if (!filter(id)) return

            const isClient = !id.includes("worker_file")

            return { code: isClient ? clientCodeGen(code, id) : workerCodeGen(code, id) }
        },
    }
}
