import { describe, expect, it } from "bun:test"
import { Heap, IndexedHeap } from "./heap"

type IndexedItem = { id: string; value: number }

class TestHeap<T> extends Heap<T> {
    getHeap() {
        return this.heap
    }
    setHeap(heap: T[]) {
        this.heap = heap
    }
    add(value: T) {
        this.heap.push(value)
        this.bubbleUp(this.heap.length - 1)
    }
}

describe("Heap", () => {
    describe("Generic Heap", () => {
        it("maintains min-heap property", () => {
            const heap = new TestHeap<number>((a, b) => a < b)
            ;[4, 5, 6, 7, 8, 9].forEach((v) => heap.add(v))

            expect(heap.peek()).toBe(4)
            ;[9, 5, 6, 7, 8, 1].forEach((v) => heap.add(v))

            expect(heap.peek()).toBe(1)
        })

        it("pushes and pops values in correct order", () => {
            const heap = new TestHeap<number>((a, b) => a < b)
            const values = [5, 3, 9, 1, 4]
            values.forEach((v) => heap.add(v))
            expect(heap.pop()).toBe(1)
            expect(heap.pop()).toBe(3)
        })

        it("peek returns top without removal", () => {
            const heap = new TestHeap<number>((a, b) => a < b)
            heap.setHeap([1, 2, 3])
            expect(heap.peek()).toBe(1)
            expect(heap.values).toEqual([1, 2, 3])
        })
    })

    describe("IndexedHeap", () => {
        const heap = new IndexedHeap<IndexedItem>(
            (a, b) => a.value < b.value,
            (item) => item.id,
        )

        it("adds and peeks correctly", () => {
            heap.add({ id: "a", value: 5 })
            heap.add({ id: "b", value: 3 })
            heap.add({ id: "c", value: 8 })

            expect(heap.peek()?.id).toBe("b")
        })

        it("updates and reorders", () => {
            heap.update("b", (item) => {
                item.value = 10
            })
            expect(heap.peek()?.id).toBe("a")
        })

        it("removes item correctly", () => {
            heap.remove("a")
            expect(heap.peek()?.id).toBe("c")
        })

        it("pop works and updates indices", () => {
            const popped = heap.pop()
            expect(popped?.id).toBe("c")
            expect(heap.peek()?.id).toBe("b") // b still remains even if its value was increased
        })
    })
})
