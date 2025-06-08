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

/**
 * Returns the value after the specified {@link timeout}.
 */
export async function delayed<T>(timeout: number, value: Lazy<T | Promise<T>>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
        setTimeout(() => {
            // biome-ignore format: terse
            try { resolve(force(value))}
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
    const interval = setInterval(async () => (await condition()) && pwr.resolve(), intervalMs)
    try {
        await Promise.race([pwr.promise, sleep(timeoutMs)])
    } finally {
        clearInterval(interval)
    }
}
