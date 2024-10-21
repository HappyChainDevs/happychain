import path from "node:path"
import { findExports as mllyFindExports } from "mlly"

/** Determines if the transformer/plugin should handle the file or not. */
export const filter = (id: string) => id.includes(".sw.ts")

/**
 * Returns all user defined exports _except_ for reserved keywords 'dispatch' and 'addMessageListener'
 */
const reservedWords = new Set(["dispatch", "addMessageListener"])
export function findExports(code: string) {
    return mllyFindExports(code).filter((ex) => {
        if (!ex.name) {
            console.warn(`[@happychain/worker] export missing name ${ex.name}`)
            return false
        }

        if (reservedWords.has(ex.name)) {
            console.warn(`[@happychain/worker] export reserved name used ${ex.name}`)
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
