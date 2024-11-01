/**
 * Type-aware version of {@link Object.keys} that uses the correct type for keys.
 */
export function keys<K extends PropertyKey, T>(object: Record<K, T>) {
    return Object.keys(object) as K[]
}

/**
 * Type-aware version of {@link Object.entries} that uses the correct type for keys.
 */
export function entries<K extends PropertyKey, T>(object: Record<K, T>) {
    return Object.entries(object) as [K, T][]
}
