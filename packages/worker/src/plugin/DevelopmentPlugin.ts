import { clientCodeGen, workerCodeGen } from "./codegen.ts"
import { createPlugin } from "./common"

function developmentTransform(code: string, id: string): string {
    const isClient = !id.includes("worker_file")
    return isClient ? clientCodeGen(code, id) : workerCodeGen(code, id)
}

/**
 * Plugin runs during the 'serve' command, i.e. 'bun vite'
 *
 * This generates both client & server code during development bundling
 */
export function DevelopmentPlugin() {
    return createPlugin("development", "serve", developmentTransform)
}
