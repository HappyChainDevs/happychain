/**
 * Get a value from a map, if it doesn't exist, set it and return it.
 */
export function getOrSet<K, V>(map: Map<K, V>, key: K, value: V | (() => V)): V {
    if (map.has(key)) return map.get(key)!
    const _value = typeof value === "function" ? (value as () => V)() : value
    map.set(key, _value)
    return _value
}

export async function getOrSetAsync<K, V>(map: Map<K, V>, key: K, value: Promise<V> | (() => Promise<V>)): Promise<V> {
    if (map.has(key)) return map.get(key)!
    const _value = typeof value === "function" ? await (value as () => Promise<V>)() : await value
    map.set(key, _value)
    return _value
}

/**
 * Extends the native {@link Map} class with useful helper functions.
 */
export class HappyMap<K, V> extends Map<K, V> {
    getOrSet(key: K, value: V | (() => V)): V {
        return getOrSet(this, key, value)
    }
    getOrSetAsync(key: K, value: Promise<V> | (() => Promise<V>)): Promise<V> {
        return getOrSetAsync(this, key, value)
    }
}
