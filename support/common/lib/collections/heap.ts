/**
 * A generic binary heap that orders elements based on a provided comparison function.
 * Can be used as a min-heap or max-heap depending on the comparator logic.
 */
export class Heap<T> {
    protected heap: T[] = []
    protected compare: (a: T, b: T) => boolean

    constructor(compare: (a: T, b: T) => boolean) {
        this.compare = compare
    }

    /** Returns a shallow copy of the heap values in current order. */
    get values(): T[] {
        return [...this.heap]
    }

    /** Returns the top element of the heap without removing it. */
    peek(): T | undefined {
        return this.heap[0]
    }

    /** Removes and returns the top element. */
    pop(): T | undefined {
        if (this.heap.length === 0) return undefined
        const top = this.heap[0]
        const last = this.heap.pop()!
        if (this.heap.length > 0) {
            this.heap[0] = last
            this.bubbleDown(0)
        }
        return top
    }

    /** Returns the index of the parent node for the given index. */
    protected getParentIndex(index: number): number {
        return Math.floor((index - 1) / 2)
    }

    /** Returns the index of the left child for the given index. */
    protected getLeftChildIndex(index: number): number {
        return 2 * index + 1
    }

    /** Returns the index of the right child for the given index. */
    protected getRightChildIndex(index: number): number {
        return 2 * index + 2
    }

    /** Swaps two elements in the heap. */
    protected swap(index1: number, index2: number): void {
        ;[this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]]
    }

    /** Moves the element at the given index up to restore heap order. */
    protected bubbleUp(index: number): void {
        let currentIndex = index
        while (currentIndex > 0) {
            const parentIndex = this.getParentIndex(currentIndex)
            if (this.compare(this.heap[currentIndex], this.heap[parentIndex])) {
                this.swap(currentIndex, parentIndex)
                currentIndex = parentIndex
            } else {
                break
            }
        }
    }

    /** Moves the element at the given index down to restore heap order. */
    protected bubbleDown(index: number): void {
        let currentIndex = index
        let nextIndex = currentIndex

        while (true) {
            const left = this.getLeftChildIndex(currentIndex)
            const right = this.getRightChildIndex(currentIndex)

            if (left < this.heap.length && this.compare(this.heap[left], this.heap[nextIndex])) {
                nextIndex = left
            }
            if (right < this.heap.length && this.compare(this.heap[right], this.heap[nextIndex])) {
                nextIndex = right
            }

            if (nextIndex === currentIndex) break

            this.swap(currentIndex, nextIndex)
            currentIndex = nextIndex
        }
    }
}

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
