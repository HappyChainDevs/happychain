import type { Account } from "viem/accounts"

interface Executor {
    account: Account
    jobCount: number
}

/**
 * MinHeap to track Executors by job count.
 * The executor with the least job count is at the top of the heap and can be accessed with .peek()
 */
export class ExecutorHeap {
    private heap: Executor[] = []
    private indices = new Map<`0x${string}`, number>() // Map account address to heap index

    get values(): Executor[] {
        return [...this.heap]
    }

    /**
     * Adds a new Executor to the heap.
     */
    public add(account: Account): void {
        const address = account.address
        if (this.indices.has(address)) return // Skip if already exists

        const newExecutor = { account, jobCount: 0 }
        this.heap.push(newExecutor)
        const index = this.heap.length - 1
        this.indices.set(address, index)
        this.bubbleUp(index)
    }

    /**
     * Increment job count of the supplied address
     */
    public increment(address: `0x${string}`): boolean {
        const currentIndex = this.indices.get(address)
        if (currentIndex === undefined) return false

        this.heap[currentIndex].jobCount++
        this.bubbleDown(currentIndex)
        return true
    }

    /**
     * Decrement job count of the supplied address
     */
    public decrement(address: `0x${string}`): boolean {
        const currentIndex = this.indices.get(address)
        if (currentIndex === undefined) return false

        this.heap[currentIndex].jobCount--
        this.bubbleUp(currentIndex)
        return true
    }

    public peek(): Executor {
        return this.heap[0]
    }

    private getParentIndex(index: number): number {
        return Math.floor((index - 1) / 2)
    }

    private getLeftChildIndex(index: number): number {
        return 2 * index + 1
    }

    private getRightChildIndex(index: number): number {
        return 2 * index + 2
    }

    private swap(index1: number, index2: number): void {
        // Update indices map before swapping
        const addr1 = this.heap[index1].account.address
        const addr2 = this.heap[index2].account.address
        this.indices.set(addr1, index2)
        this.indices.set(addr2, index1)

        // Swap elements in heap
        ;[this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]]
    }

    private bubbleUp(index: number): void {
        let currentIndex = index
        while (currentIndex > 0) {
            const parentIndex = this.getParentIndex(currentIndex)
            if (this.heap[currentIndex].jobCount < this.heap[parentIndex].jobCount) {
                this.swap(currentIndex, parentIndex)
                currentIndex = parentIndex
            } else {
                break
            }
        }
    }

    private bubbleDown(index: number): void {
        let currentIndex = index
        let smallest = currentIndex

        while (true) {
            const left = this.getLeftChildIndex(currentIndex)
            const right = this.getRightChildIndex(currentIndex)

            if (left < this.heap.length && this.heap[left].jobCount < this.heap[smallest].jobCount) {
                smallest = left
            }
            if (right < this.heap.length && this.heap[right].jobCount < this.heap[smallest].jobCount) {
                smallest = right
            }

            if (smallest === currentIndex) break

            this.swap(currentIndex, smallest)
            currentIndex = smallest
        }
    }
}
