/**
 * Prints the message to stderr then exits with code 1.
 */
export function errorExit(message: string): never {
    console.error(message)
    process.exit(1)
}

/**
 * Checks that the (absolute or relative) path does not contain "." or ".." components, except for a
 * "." component in the lead position (or aborts with an error).
 *
 * Returns a path without leading "./" or trailing "/".
 *
 * The path is allowed to be "." by itself.
 */
export function normalizePath(path: string): string
export function normalizePath(path: undefined): undefined
export function normalizePath(path: string | undefined): string | undefined
export function normalizePath(path: string | undefined): string | undefined {
    if (path === undefined) return undefined
    path.split("/").forEach((component, i) => {
        if (component === "." && i !== 0) {
            throw new Error(`Path "${path}" may not contain "." component except in leading position`)
        }
        if (component === "..") {
            throw new Error(`Path "${path}" may not contain ".." component`)
        }
    })
    return path
        .replace(/^\.\//, "") // remove leading "./"
        .replace(/\/$/, "") // remove trailing "/"
}

/**
 * Just like {@link normalizePath}, but the returned path will start with "./" if it is relative and
 * is not just ".".
 */
export function normalizePathDot(path: string): string
export function normalizePathDot(path: undefined): undefined
export function normalizePathDot(path: string | undefined): string | undefined
export function normalizePathDot(path: string | undefined): string | undefined {
    if (path === undefined) return undefined
    const out = normalizePath(path)
    return out === "." || out.startsWith("/") ? out : "./" + out
}

/**
 * Just like {@link normalizePathDot}, but additionally checks that the path is relative or aborts
 * with an error.
 */
export function normalizeRelativePath(path: string): string
export function normalizeRelativePath(path: undefined): undefined
export function normalizeRelativePath(path: string | undefined): string | undefined
export function normalizeRelativePath(path: string | undefined): string | undefined {
    if (path === undefined) return undefined
    if (path.startsWith("/")) {
        throw new Error(`Path "${path}" must be relative`)
    }
    return normalizePathDot(path)
}
