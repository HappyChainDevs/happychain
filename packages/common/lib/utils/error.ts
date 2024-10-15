export function unknownToError(u: unknown): Error {
    return u instanceof Error ? u : new Error(JSON.stringify(u, null, 2))
}
