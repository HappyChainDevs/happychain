import type { Plugin } from "vite"
import pkg from "../../package.json"
import { workerCodeGen } from "./codegen"
import { filter } from "./utils"

/**
 * Plugin runs during the 'build' command, i.e. 'bun vite build'
 *
 * This generates the 'server-side' (worker) code.
 *
 * The generated code is injected and prepended to the user written code
 * and handles the RPC functionality, managing requests and responses between
 * server and clients
 */
export function SharedWorkerServerPlugin(): Plugin {
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
