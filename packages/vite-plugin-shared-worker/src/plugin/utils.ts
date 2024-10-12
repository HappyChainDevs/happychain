import path from "node:path"
import { findExports as mllyFindExports } from "mlly"

/** Determines if the transformer/plugin should handle the file or not. */
export const filter = (id: string) => {
    return id.includes(".sw.ts")
}

/**
 * Returns all user defined exports _except_ for reserved keywords 'dispatch' and 'addMessageListener'
 */
const reservedWords = new Set(["dispatch", "addMessageListener"])
export function findExports(code: string) {
    return mllyFindExports(code).filter((ex) => !!ex.name && !reservedWords.has(ex.name))
}

export function getWorkerName(id: string) {
    return path.basename(id.split("?")[0])
}
