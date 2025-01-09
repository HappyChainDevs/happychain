import { workerCodeGen } from "./codegen.ts"
import { createPlugin } from "./common.ts"

/**
 * Plugin runs during the 'build' command, i.e. 'bun vite build'
 *
 * This generates the 'server-side' (worker) code.
 *
 * The generated code is injected and prepended to the user written code
 * and handles the RPC functionality, managing requests and responses between
 * server and clients
 */
export function SharedWorkerServerPlugin() {
    return createPlugin("worker", "build", workerCodeGen)
}
