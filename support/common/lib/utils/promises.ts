/** Type of the parameter in the {@link PromiseConstructor#resolve} function. */
export type ResolveInputType<T> = T | PromiseLike<T>

/** Type of the {@link PromiseConstructor#resolve} function. */
export type ResolveType<T> = (value: ResolveInputType<T>) => void

/** Type of the {@link PromiseConstructor#reject} function. */
// biome-ignore lint/suspicious/noExplicitAny: actual library type
export type RejectType = (reason: any) => void

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
 * Returns the value from the callback after the specified {@link timeout}.
 */
export async function delayed<T>(timeout: number, callback: () => T | Promise<T>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
        setTimeout(() => {
            // biome-ignore format: terse
            try { resolve(callback())}
            catch (e) { reject(e) }
        }, timeout)
    })
}
