import { type Fn, type Lazy, force } from "./functions"
import { sleep } from "./sleep"

export type Awaitable<T> = T | Promise<T>

/** Type of the parameter in the {@link PromiseConstructor#resolve} function. */
export type ResolveInputType<T> = T | PromiseLike<T>

/** Type of the {@link PromiseConstructor#resolve} function. */
export type ResolveType<T> = (value: ResolveInputType<T>) => void

/** Type of the {@link PromiseConstructor#reject} function. */
export type RejectType = (reason: unknown) => void

export type Resolvers<T> = {
    resolve: ResolveType<T>
    reject: RejectType
}
/** Object containing a promise and it's resolve and reject function. */
export type PromiseWithResolvers<T> = Resolvers<T> & {
    promise: Promise<T>
}

/** Creates a new promise and exposes its resolve and reject functions. */
export function promiseWithResolvers<T>(): PromiseWithResolvers<T> {
    let resolve: ResolveType<T>
    let reject: RejectType
    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
    })
    return { promise, resolve: resolve!, reject: reject! }
}

/** `T` if `T` is not a promise, otherwise `never`. */
export type NotPromise<T> = T extends Promise<unknown> ? never : T

/**
 * Either `T` or `Promise<T>`.
 *
 * Note that `T | Promise<T>` is not a suitable type for this, as `Promise<X>`
 * always matches `T` — this uses {@link NotPromise} to alleviate this issue.
 */
export type MaybePromise<T> = Promise<T> | NotPromise<T>

/**
 * Returns the value after the specified {@link timeout}.
 */
export async function delayed<T>(timeout: number, value: Lazy<MaybePromise<T>>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
        setTimeout(async () => {
            // biome-ignore format: terse
            try { resolve(await force(value))}
            catch (e) { reject(e) }
        }, timeout)
    })
}

/**
 * Returns a promise that waits until either {@link condition} returns a truthy value, or {@link timeoutMs} milliseconds elapse
 * (in which case it rejects with a {@link TimeoutError}). The conditions is called every {@link intervalMs} milliseconds.
 */
export async function waitForCondition(condition: Fn, timeoutMs = 30_000, intervalMs = 50): Promise<void> {
    if (await condition()) return
    const pwr = Promise.withResolvers()
    const interval = setInterval(async () => (await condition()) && pwr.resolve(undefined), intervalMs)
    try {
        await Promise.race([pwr.promise, sleep(timeoutMs)])
    } finally {
        clearInterval(interval)
    }
}
/**
 * Returns a promise that waits until either {@link condition} returns a value other than undefined,
 * or {@link timeoutMs} milliseconds elapse.
 */
export async function waitForValue<TResult>(
    condition: Fn<TResult>,
    timeoutMs = 30_000,
    intervalMs = 50,
): Promise<TResult | undefined> {
    const value = await condition()
    if (value !== undefined) return value
    const pwr = Promise.withResolvers<TResult>()
    const interval = setInterval(async () => {
        const value = await condition()
        if (value) pwr.resolve(value)
    }, intervalMs)
    try {
        return await Promise.race([pwr.promise, sleep(timeoutMs).then(() => undefined)])
    } finally {
        clearInterval(interval)
    }
}
