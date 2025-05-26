interface LruCacheOptions {
    max?: number
    maxAge?: number
    stale?: boolean
}

interface LruCacheEntry<T> {
    expires: number | false
    content: T
}

export class LruCache<K, V> {
    #max: number
    #maxAge: number
    #stale: boolean
    #map: Map<K, LruCacheEntry<V>>
    #pruneInterval: NodeJS.Timeout | null = null

    constructor(opts?: LruCacheOptions | number) {
        const {
            max = Number.POSITIVE_INFINITY,
            maxAge = -1,
            stale = false,
        } = typeof opts === "number" ? { max: opts } : opts || {}
        this.#map = new Map()
        this.#max = max
        this.#maxAge = maxAge
        this.#stale = stale
    }

    // --- Core Methods ---

    // Peek without revalidating or updating LRU order
    peek(key: K): V | undefined {
        return this.get(key, false)
    }

    set(key: K, content: V): this {
        if (this.has(key)) this.delete(key)

        // prune entries on insert
        this.prune()

        // start background pruneing if not already running
        this.startBackgroundPruning()

        if (this.size + 1 > this.#max) {
            const firstKey = this.keys().next().value
            if (firstKey !== undefined) this.delete(firstKey)
        }

        const expires = this.#maxAge > -1 ? this.#maxAge + Date.now() : false
        this.#map.set(key, { expires, content })
        return this
    }

    get(key: K, mut = true): V | undefined {
        const entry = this.#map.get(key)
        if (entry === undefined) return undefined

        const { expires, content } = entry
        if (this.#isExpired(expires)) {
            this.delete(key)
            return this.#stale ? content : undefined
        }

        if (mut) this.set(key, content)
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
        if (this.#stale) return // Don’t prune if stale is allowed
        for (const key of this.expiredKeys()) this.delete(key)
        if (!this.size) this.stopBackgroundPruning()
    }

    expiredKeys(): K[] {
        const expiredKeys: K[] = []
        for (const [key, { expires }] of this.#map) {
            if (this.#isExpired(expires)) expiredKeys.push(key)
        }
        return expiredKeys
    }

    startBackgroundPruning(): void {
        if (this.#maxAge <= 0) return // max age is disabled
        if (this.#stale) return // stale values are allowed, no need for background pruning
        if (this.#pruneInterval) return // Already running
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
            if (!this.#isExpired(expires) || this.#stale) count++
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
            if (!this.#isExpired(expires) || this.#stale) {
                yield [key, content]
            }
        }
    }

    *keys(): IterableIterator<K> {
        for (const [key, { expires }] of this.#map) {
            if (!this.#isExpired(expires) || this.#stale) {
                yield key
            }
        }
    }

    *values(): IterableIterator<V> {
        for (const [_, { expires, content }] of this.#map) {
            if (!this.#isExpired(expires) || this.#stale) {
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
