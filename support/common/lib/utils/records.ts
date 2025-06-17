/**
 * Type-aware version of {@link Object.keys} that uses the correct type for keys.
 */
export function keys<K extends PropertyKey, T>(object: Record<K, T>) {
    return Object.keys(object) as K[]
}

/**
 * Type-aware version of {@link Object.entries} that uses the correct type for keys.
 */
export function entries<T, K extends keyof T>(object: T): [K, T[K]][] {
    return Object.entries(object as object) as [K, T[K]][]
}
