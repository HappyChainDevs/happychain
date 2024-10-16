import type { Plugin } from "vite"
import pkg from "../../package.json"
import { shimCodeGen } from "./codegen"
import { filter } from "./utils"

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
        config(_config, env) {
            if (env.command === "serve") {
                return {
                    build: {
                        // required to avoid `"addMessageListener" is not exported by` type errors
                        rollupOptions: { preserveEntrySignatures: "strict" },
                    },
                }
            }
        },
        transform(code: string, id: string) {
            if (!filter(id)) return
            return { code: shimCodeGen(code, id) }
        },
    }
}
