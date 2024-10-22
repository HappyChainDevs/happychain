import path from "node:path"
import { findExports as mllyFindExports } from "mlly"

/** Determines if the transformer/plugin should handle the file or not. */
export const filter = (id: string) => id.includes(".sw.ts")

/**
 * Returns all user defined exports _except_ for reserved keywords 'dispatch' and 'addMessageListener'
 */
const reservedWords = new Set(["dispatch", "addMessageListener"])
export function findExports(code: string, id: string) {
    return mllyFindExports(code).filter((ex) => {
        if (ex.specifier === "@happychain/worker/runtime") {
            // This is expected. Its re-exporting runtime components and can be safely ignored.
            // No code will be generated as a result of this export but matching exports are
            // individually injected by default into the heads of the client/server
            return false
        }

        if (!ex.name) {
            console.warn(`[@happychain/worker] export missing name ${ex.name} in ${getWorkerName(id)}`)
            return false
        }

        if (reservedWords.has(ex.name)) {
            // this is expected if the consuming app uses these features
            return false
        }

        return true
    })
}

/**
 * finds the worker filename without .ts extension
 * i.e. ./foo/bar/baz.sw.ts => baz.sw
 */
export function getWorkerName(id: string) {
    return path.basename(id.split("?")[0])
}
