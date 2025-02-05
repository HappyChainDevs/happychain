/**
 * Map that keys on two values — internally implemented as a two-level map.
 */
export class Map2<K1, K2, V> {
    private readonly map: Map<K1, Map<K2, V>>

    constructor(entries?: ReadonlyArray<[K1, K2, V]>) {
        this.map = new Map<K1, Map<K2, V>>()
        if (entries) {
            for (const [k1, k2, v] of entries) {
                this.set(k1, k2, v)
            }
        }
    }

    set(key1: K1, key2: K2, value: V): this {
        let innerMap = this.map.get(key1)
        if (!innerMap) {
            innerMap = new Map<K2, V>()
            this.map.set(key1, innerMap)
        }
        innerMap.set(key2, value)
        return this
    }

    get(key1: K1, key2: K2): V | undefined {
        const innerMap = this.map.get(key1)
        return innerMap?.get(key2)
    }

    has(key1: K1, key2: K2): boolean {
        const innerMap = this.map.get(key1)
        return innerMap ? innerMap.has(key2) : false
    }

    delete(key1: K1, key2: K2): boolean {
        const innerMap = this.map.get(key1)
        if (!innerMap) return false

        const result = innerMap.delete(key2)
        if (innerMap.size === 0) {
            this.map.delete(key1)
        }
        return result
    }

    clear(): void {
        this.map.clear()
    }

    forEach(callbackfn: (value: V, key1: K1, key2: K2, map: Map2<K1, K2, V>) => void): void {
        this.map.forEach((innerMap, key1) => {
            innerMap.forEach((value, key2) => {
                callbackfn(value, key1, key2, this)
            })
        })
    }

    *entries(): IterableIterator<[K1, K2, V]> {
        for (const [key1, innerMap] of this.map.entries()) {
            for (const [key2, value] of innerMap.entries()) {
                yield [key1, key2, value]
            }
        }
    }

    *keys(): IterableIterator<[K1, K2]> {
        for (const [key1, innerMap] of this.map.entries()) {
            for (const key2 of innerMap.keys()) {
                yield [key1, key2]
            }
        }
    }

    *values(): IterableIterator<V> {
        for (const innerMap of this.map.values()) {
            yield* innerMap.values()
        }
    }

    get size(): number {
        let count = 0
        for (const innerMap of this.map.values()) {
            count += innerMap.size
        }
        return count
    }

    [Symbol.iterator](): IterableIterator<[K1, K2, V]> {
        return this.entries()
    }

    // Get all values for a single key1
    getAll(key1: K1): Map<K2, V> | undefined {
        return this.map.get(key1)
    }

    // Delete all entries for a key1
    deleteAll(key1: K1): boolean {
        return this.map.delete(key1)
    }

    getOrSet(key1: K1, key2: K2, value: V | (() => V)): V {
        let innerMap = this.map.get(key1)
        if (!innerMap) {
            innerMap = new Map<K2, V>()
            this.map.set(key1, innerMap)
        }

        if (innerMap.has(key2)) {
            return innerMap.get(key2)!
        }

        const _value = typeof value === "function" ? (value as () => V)() : value
        innerMap.set(key2, _value)
        return _value
    }

    async getOrSetAsync(key1: K1, key2: K2, value: Promise<V> | (() => Promise<V>)): Promise<V> {
        let innerMap = this.map.get(key1)
        if (!innerMap) {
            innerMap = new Map<K2, V>()
            this.map.set(key1, innerMap)
        }

        if (innerMap.has(key2)) {
            return innerMap.get(key2)!
        }

        const _value = typeof value === "function" ? await (value as () => Promise<V>)() : await value

        innerMap.set(key2, _value)
        return _value
    }
}
