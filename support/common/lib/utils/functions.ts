export type Lazy<T> = T extends CallableFunction ? never : T | (() => T)

export function force<T>(lazy: Lazy<T>): T {
    return typeof lazy === "function" ? lazy() : (lazy as T)
}
