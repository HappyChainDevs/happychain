import { shimCodeGen } from "./codegen.ts"
import { createPlugin } from "./common"

/**
 * Plugin can run during both the 'build' or 'serve' commands, i.e. 'bun vite build' and 'bun vite'
 *
 * Injects familiar worker interface into the 'worker' file
 * however runs in the local context without any worker
 * as if you just imported the file directly.
 */
export function SharedWorkerShimPlugin() {
    return createPlugin("worker", "build", shimCodeGen)
}
