import { Heap } from "./heap"

/**
 * A binary heap with index tracking and support for in-place updates and keyed removal.
 */
export class IndexedHeap<T> extends Heap<T> {
    #indices = new Map<string, number>()
    #getKey: (item: T) => string

    constructor(compare: (a: T, b: T) => boolean, getKey: (item: T) => string) {
        super(compare)
        this.#getKey = getKey
    }

    /** Adds a new item to the heap if it doesn't already exist. */
    add(item: T): void {
        const key = this.#getKey(item)
        if (this.#indices.has(key)) return

        this.heap.push(item)
        const index = this.heap.length - 1
        this.#indices.set(key, index)
        this.bubbleUp(index)
    }

    /**
     * Mutates an item in place and rebalances the heap.
     * DO NOT modify the item's key field!
     */
    update(key: string, mutate: (item: T) => void): boolean {
        const index = this.#indices.get(key)
        if (index === undefined) return false
        const item = this.heap[index]
        const originalKey = this.#getKey(item)

        mutate(item)

        const newKey = this.#getKey(item)
        if (newKey !== originalKey)
            throw new Error(`[IndexedHeap] Key changed during mutation: '${originalKey}' → '${newKey}'`)

        // Rebalance in both directions
        // This is necessary because the item may have moved in the heap
        // and to compare the old with the new position, we would otherwise
        // need to make a copy or the original to compare against. This double-bubble
        // is a bit inefficient, but it is the simplest solution. and avoids having to
        // tackle object cloning or deep equality checks.
        this.bubbleUp(index)
        this.bubbleDown(index)
        return true
    }

    /** Removes an item by its key. */
    remove(key: string): boolean {
        const index = this.#indices.get(key)
        if (index === undefined) return false

        const last = this.heap.pop()!
        this.#indices.delete(key)

        if (index < this.heap.length) {
            this.heap[index] = last
            const lastKey = this.#getKey(last)
            this.#indices.set(lastKey, index)

            this.bubbleUp(index)
            this.bubbleDown(index)
        }

        return true
    }

    /** Removes and returns the top item in the heap. */
    override pop(): T | undefined {
        if (this.heap.length === 0) return undefined

        const top = this.heap[0]
        const key = this.#getKey(top)
        const last = this.heap.pop()!
        this.#indices.delete(key)

        if (this.heap.length > 0) {
            this.heap[0] = last
            this.#indices.set(this.#getKey(last), 0)
            this.bubbleDown(0)
        }

        return top
    }

    protected override swap(i: number, j: number): void {
        const key1 = this.#getKey(this.heap[i])
        const key2 = this.#getKey(this.heap[j])
        this.#indices.set(key1, j)
        this.#indices.set(key2, i)
        super.swap(i, j)
    }
}
