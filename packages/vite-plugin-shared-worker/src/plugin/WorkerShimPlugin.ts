import type { Plugin } from "vite"
import { shimsCodeGen } from "./codegen"
import { filter } from "./utils"

/**
 * Injects familiar worker interface into the 'worker' file
 * however runs in the local context without any worker
 * as if you just imported the file directly.
 */
export function WorkerShimPlugin(): Plugin {
    return {
        name: "@happychain/vite-plugin-sharedworker:shim",
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

            return { code: shimsCodeGen(code, id) }
        },
    }
}
