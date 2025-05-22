import { beforeEach, describe, expect, it } from "bun:test"
import { type Account, generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { ExecutorHeap } from "./ExecutorHeap"

describe("ExecutorHeap", () => {
    let heap: ExecutorHeap
    let account1: Account
    let account2: Account

    beforeEach(() => {
        heap = new ExecutorHeap()

        account1 = privateKeyToAccount(generatePrivateKey())
        account2 = privateKeyToAccount(generatePrivateKey())
        heap.addAccount(account1)
        heap.addAccount(account2)
    })

    it("adds executors and returns lowest jobCount", () => {
        heap.increment(account2.address)
        expect(heap.peek().account.address).toBe(account1.address)
    })

    it("increments and decrements job counts properly", () => {
        heap.increment(account2.address)
        heap.increment(account1.address)
        heap.increment(account1.address)
        expect(heap.peek().account.address).toBe(account2.address)

        heap.decrement(account1.address)
        expect(heap.peek().account.address).toBe(account2.address)

        heap.decrement(account1.address)
        expect(heap.peek().account.address).toBe(account1.address)
    })

    it("returns all values and maintains heap", () => {
        const addresses = heap.values.map((e) => e.account.address)
        expect(addresses).toContain(account1.address)
        expect(addresses).toContain(account2.address)
    })

    it("removes executor by address", () => {
        heap.remove(account2.address)
        expect(heap.pop()?.account.address).toBe(account1.address)
        expect(heap.pop()?.account.address).toBeUndefined()
    })
})
