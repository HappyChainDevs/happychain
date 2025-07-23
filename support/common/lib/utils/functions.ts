/**
 * Fully generic function type. Any functions can be assigned to `Fn` and it can be called with any parameters
 * if the `Args` type parameter is not specified.
 */
// biome-ignore lint/suspicious/noExplicitAny: For both contravariance (assigning to type) and covariance (calling).
export type Fn<Result = unknown, Args extends any[] = any[]> = (...args: Args) => Result

/** Union between `T` and functions returning `T`. */
export type Lazy<T> = T extends CallableFunction ? never : T | (() => T)

/** Returns the value if {@link lazy} is a value, or the result of the call if {@link lazy} is a function. */
export function force<T>(lazy: Lazy<T>): T {
    return typeof lazy === "function" ? lazy() : (lazy as T)
}
