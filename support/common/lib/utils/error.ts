import { type Lazy, force } from "./functions"
import type { UnionFill } from "./types"

export function unknownToError(u: unknown): Error {
    return u instanceof Error ? u : new Error(JSON.stringify(u, null, 2))
}

export type Result<T, E> = UnionFill<{ value: T } | { error: E }>

/**
 * Returns `{ result: fn(), error: undefined }` if no exception is
 * thrown, and `{ error, result: undefined }` otherwise.
 */
export function tryCatch<T, E = unknown>(fn: () => T): Result<T, E> {
    // biome-ignore format: terse
    try { return { value: fn() } }
    catch (e) { return { error: e as E } }
}

/**
 * Returns `{ result: fn(), error: undefined }` if no exception is
 * thrown, and `{ error, result: undefined }` otherwise.
 */
export async function tryCatchAsync<T, E = unknown>(promise: Lazy<Promise<T>>): Promise<Result<T, E>> {
    // biome-ignore format: terse
    try { return { value: await force(promise) } }
    catch (e) { return { error: e as E } }
}

/** Returns `fn()` if no exception is thrown, undefined otherwise. */
export function tryCatchU<T>(fn: () => T): T | undefined {
    // biome-ignore format: terse
    try { return fn() }
    catch { return undefined }
}

/** Returns `fn()` if no exception is thrown, undefined otherwise. */
export async function tryCatchAsyncU<T>(promise: Lazy<Promise<T>>): Promise<T | undefined> {
    // biome-ignore format: terse
    try { return await force(promise) }
    catch { return undefined }
}

/**
 * Generic error representing a timeout.
 */
export class TimeoutError extends Error {}
