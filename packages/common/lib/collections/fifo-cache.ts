/**
 * A simple FIFO cache implementation: whenever putting items above capacity, the oldest item is
 * removed.
 */
export class FIFOCache<K, V> {
    private cache = new Map<K, V>()
    private keys: K[] = []
    private readonly capacity: number

    constructor(capacity: number) {
        if (capacity <= 0) {
            throw new Error("Capacity must be greater than 0")
        }
        this.capacity = capacity
    }

    put(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.set(key, value)
            return
        }

        if (this.cache.size >= this.capacity) {
            const oldestKey = this.keys.shift()
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey)
            }
        }

        this.cache.set(key, value)
        this.keys.push(key)
    }

    get(key: K): V | undefined {
        return this.cache.get(key)
    }

    flush(): void {
        this.cache.clear()
        this.keys = []
    }
}
