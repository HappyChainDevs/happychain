/** Type of the parameter in the {@link PromiseConstructor#resolve} function. */
export type ResolveInputType<T> = T | PromiseLike<T>

/** Type of the {@link PromiseConstructor#resolve} function. */
export type ResolveType<T> = (value: ResolveInputType<T>) => void

/** Type of the {@link PromiseConstructor#reject} function. */
// biome-ignore lint/suspicious/noExplicitAny: actual library type
export type RejectType = (reason: any) => void

/** Object containing a promise and it's resolve and reject function. */
export type PromiseWithResolvers<T> = {
    promise: Promise<T>
    resolve: ResolveType<T>
    reject: RejectType
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
