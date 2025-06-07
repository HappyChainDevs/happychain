import { type Lazy, force } from "../utils/functions"

/**
 * Get a value from a map, if it doesn't exist, set it and return it.
 */
export function getOrSet<K, V>(map: Map<K, V>, key: K, value: Lazy<V>): V {
    if (map.has(key)) return map.get(key)!
    const _value = force(value)
    map.set(key, _value)
    return _value
}

export async function getOrSetAsync<K, V>(map: Map<K, V>, key: K, value: Lazy<Promise<V>>): Promise<V> {
    if (map.has(key)) return map.get(key)!
    const _value = await force(value)
    map.set(key, _value)
    return _value
}

export function transform<K, V>(map: Map<K, V>, key: K, f: (v: V | undefined) => V): V {
    const current = map.get(key)
    const updated = f(current)
    map.set(key, updated)
    return updated
}

/**
 * Extends the native {@link Map} class with useful helper functions.
 */
export class HappyMap<K, V> extends Map<K, V> {
    getOrSet(key: K, value: Lazy<V>): V {
        return getOrSet(this, key, value)
    }
    getOrSetAsync(key: K, value: Lazy<Promise<V>>): Promise<V> {
        return getOrSetAsync(this, key, value)
    }
    transform(key: K, f: (v: V | undefined) => V): V {
        return transform(this, key, f)
    }
}
