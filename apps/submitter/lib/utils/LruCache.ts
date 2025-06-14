interface LruCacheOptions {
    /** Maximum number of entries in the cache. */
    max?: number
    /** If > 0, the maximum age (in milliseconds) that entries stay in the cache. */
    maxAge?: number
}

interface LruCacheEntry<T> {
    expires: number | false
    content: T
}

/**
 * A least-recently-used with optional age-based expiry.
 */
export class LruCache<K, V> {
    readonly #max: number
    readonly #maxAge: number
    // Note: JS maps iterate their entries in order of insertion, but setting an existing key does not update this
    // order, the key needs to be deleted then re-inserted.
    readonly #map: Map<K, LruCacheEntry<V>>
    #pruneInterval: NodeJS.Timeout | null = null

    constructor(opts?: LruCacheOptions | number) {
        const { max = Number.POSITIVE_INFINITY, maxAge = 0 } = typeof opts === "number" ? { max: opts } : opts || {}
        this.#map = new Map()
        this.#max = max
        this.#maxAge = maxAge
    }

    // --- Core Methods ---

    /** Peek without updating age or LRU ordering. */
    peek(key: K): V | undefined {
        return this.get(key, false)
    }

    /** Set a key-value mapping, updating the LRU order of the key to last, and resetting the key's age. */
    set(key: K, content: V): this {
        if (!this.has(key)) {
            // cache will grow

            // Start background age-based pruning if not already running.
            this.startBackgroundPruning()

            if (this.size + 1 > this.#max) {
                // We're full — run age-based pruning now.
                this.prune()
            }

            if (this.size + 1 > this.#max) {
                // Still full, evict oldest key.
                const firstKey = this.keys().next().value
                this.delete(firstKey!)
            }
        }

        const expires = this.#maxAge > 0 ? this.#maxAge + Date.now() : false
        this.#map.delete(key) // Necessary to update LRU ordering
        this.#map.set(key, { expires, content })
        return this
    }

    /**
     * Returns the value associated with the key. If {@link refresh} is true (the default)
     * and age-based expiry is enabled, resets the value's age.
     */
    get(key: K, refresh = true): V | undefined {
        const entry = this.#map.get(key)
        if (entry === undefined) return undefined
        const { expires, content } = entry
        if (this.#isExpired(expires)) return undefined
        if (refresh && this.#maxAge > 0) this.set(key, content)
        return content
    }

    has(key: K): boolean {
        return this.get(key, false) !== undefined
    }

    delete(key: K): boolean {
        const done = this.#map.delete(key)
        if (!this.size) this.stopBackgroundPruning()
        return done
    }

    clear(): void {
        this.#map.clear()
        this.stopBackgroundPruning()
    }

    prune(): void {
        if (this.#maxAge <= 0) return
        for (const key of this.expiredKeys()) this.delete(key)
        if (!this.size) this.stopBackgroundPruning()
    }

    expiredKeys(): K[] {
        const expiredKeys: K[] = []
        if (this.#maxAge <= 0) return expiredKeys
        for (const [key, { expires }] of this.#map) {
            if (this.#isExpired(expires)) expiredKeys.push(key)
        }
        return expiredKeys
    }

    startBackgroundPruning(): void {
        if (this.#maxAge <= 0) return
        if (this.#pruneInterval) return // already running
        this.#pruneInterval = setInterval(() => this.prune(), this.#maxAge)
    }

    stopBackgroundPruning(): void {
        if (!this.#pruneInterval) return
        clearInterval(this.#pruneInterval)
        this.#pruneInterval = null
    }

    get size(): number {
        let count = 0
        for (const { expires } of this.#map.values()) {
            if (!this.#isExpired(expires)) count++
        }
        return count
    }

    // --- Iteration Methods (Map-like) ---

    forEach(callbackfn: (value: V, key: K, map: this) => void, thisArg?: unknown): void {
        for (const [key, value] of this.entries()) {
            callbackfn.call(thisArg, value, key, this)
        }
    }

    *entries(): IterableIterator<[K, V]> {
        for (const [key, { expires, content }] of this.#map) {
            if (!this.#isExpired(expires)) {
                yield [key, content]
            }
        }
    }

    *keys(): IterableIterator<K> {
        for (const [key, { expires }] of this.#map) {
            if (!this.#isExpired(expires)) {
                yield key
            }
        }
    }

    *values(): IterableIterator<V> {
        for (const [_, { expires, content }] of this.#map) {
            if (!this.#isExpired(expires)) {
                yield content
            }
        }
    }

    [Symbol.iterator] = this.entries

    // --- Internal ---

    #isExpired(expires: number | false): boolean {
        return typeof expires === "number" && Date.now() >= expires
    }

    [Symbol.toStringTag] = "LruCache"
}
