import { type Lazy, force } from "./functions"

export function unknownToError(u: unknown): Error {
    return u instanceof Error ? u : new Error(JSON.stringify(u, null, 2))
}

/**
 * Discriminated union between a value and an error.
 *
 * The error type `E` must be an object and is assumed to be `object` by default.
 * This enables the following pattern:
 * ```
 * const { value, error } = result
 * if (!error) doSomething(value) // typed as T
 * ```
 *
 * The object bound makes sure the flow typing works properly, as other types can be falsy (0, "", [], ...).
 *
 * You can reproduce this pattern for custom shapes with {@link UnionFill}.
 */
export type Result<T, E extends object = object> = { value: T; error?: undefined } | { value?: undefined; error: E }

/**
 * Returns `{ result: fn(), error: undefined }` if no exception is
 * thrown, and `{ error, result: undefined }` otherwise.
 */
export function tryCatch<T, E extends object = object>(fn: () => T): Result<T, E> {
    // biome-ignore format: terse
    try { return { value: fn() } }
    catch (e) { return { error: e as E } }
}

/**
 * Returns `{ result: fn(), error: undefined }` if no exception is
 * thrown, and `{ error, result: undefined }` otherwise.
 */
export async function tryCatchAsync<T, E extends object = object>(promise: Lazy<Promise<T>>): Promise<Result<T, E>> {
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
