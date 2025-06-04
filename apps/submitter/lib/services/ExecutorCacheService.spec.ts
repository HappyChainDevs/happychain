import { beforeEach, describe, expect, it } from "bun:test"
import { sleep } from "@happy.tech/common"
import { type Account, generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { ExecutorCacheService } from "./ExecutorCacheService"

describe("ExecutorCacheService", () => {
    let executorService: ExecutorCacheService
    let testUserAccount: Account
    let accounts: Account[]

    beforeEach(() => {
        accounts = [privateKeyToAccount(generatePrivateKey()), privateKeyToAccount(generatePrivateKey())]
        executorService = new ExecutorCacheService(accounts, 100)
        testUserAccount = privateKeyToAccount(generatePrivateKey())
    })
    it("returns an executor", () => {
        const account = executorService.get("0x1", testUserAccount.address, 1n)
        expect(account).toBeDefined()
        expect(account.address).toBe(accounts[0].address)
    })

    it("returns the same executor for multiple calls with the same user account and nonceTrack", () => {
        const expected = accounts[0].address
        expect(executorService.get("0x1", testUserAccount.address, 1n).address).toBe(expected)
        expect(executorService.get("0x2", testUserAccount.address, 1n).address).toBe(expected)
        expect(executorService.get("0x3", testUserAccount.address, 1n).address).toBe(expected)
        expect(executorService.get("0x4", testUserAccount.address, 1n).address).toBe(expected)
        expect(executorService.get("0x5", testUserAccount.address, 1n).address).toBe(expected)
    })

    it("returns the different executors for multiple calls with the same user account and different nonceTrack", () => {
        const first = accounts[0].address
        const second = accounts[1].address
        expect(executorService.get("0x1", testUserAccount.address, 1n).address).toBe(first)
        expect(executorService.get("0x2", testUserAccount.address, 2n).address).toBe(second)
        expect(executorService.get("0x3", testUserAccount.address, 3n).address).toBe(second)
        expect(executorService.get("0x4", testUserAccount.address, 4n).address).toBe(first)
    })

    it("returns allows hashes to expire", async () => {
        const first = accounts[0].address
        const second = accounts[1].address
        expect(executorService.get("0x1", testUserAccount.address, 1n).address).toBe(first)
        expect(executorService.get("0x2", testUserAccount.address, 2n).address).toBe(second)
        await sleep(100) // allows the timeout to expire
        expect(executorService.get("0x3", testUserAccount.address, 3n).address).toBe(first)
        expect(executorService.get("0x4", testUserAccount.address, 4n).address).toBe(second)
    })

    it("maintains consistency through ttl expirys", async () => {
        const first = accounts[0].address
        const second = accounts[1].address
        expect(executorService.get("0x1", testUserAccount.address, 1n).address).toBe(first)
        expect(executorService.get("0x2", testUserAccount.address, 2n).address).toBe(second)
        await sleep(50)
        expect(executorService.get("0x3", testUserAccount.address, 2n).address).toBe(second)
        await sleep(50)
        expect(executorService.get("0x4", testUserAccount.address, 2n).address).toBe(second)
        await sleep(50)
        expect(executorService.get("0x5", testUserAccount.address, 2n).address).toBe(second)
        await sleep(50)
        expect(executorService.get("0x6", testUserAccount.address, 2n).address).toBe(second)
        await sleep(50)

        // new entry (3n), first has expired, second has not
        expect(executorService.get("0x7", testUserAccount.address, 2n).address).toBe(second)
        expect(executorService.get("0x8", testUserAccount.address, 3n).address).toBe(first)
        expect(executorService.get("0x9", testUserAccount.address, 4n).address).toBe(first)
        expect(executorService.get("0x10", testUserAccount.address, 5n).address).toBe(first)
    })

    it("expires and refreshes", async () => {
        const first = accounts[0].address
        const second = accounts[1].address
        expect(executorService.get("0x1", testUserAccount.address, 1n).address).toBe(first)
        expect(executorService.get("0x1", testUserAccount.address, 2n).address).toBe(second)
        expect(executorService.stats()).toStrictEqual([
            { address: second, count: 1 },
            { address: first, count: 1 },
        ])
        await sleep(50)
        expect(executorService.get("0x2", testUserAccount.address, 2n).address).toBe(second)
        expect(executorService.get("0x2", testUserAccount.address, 3n).address).toBe(first)
        expect(executorService.stats()).toStrictEqual([
            { address: first, count: 2 },
            { address: second, count: 2 },
        ])
        await sleep(50)
        expect(executorService.get("0x3", testUserAccount.address, 2n).address).toBe(second)
        expect(executorService.get("0x3", testUserAccount.address, 3n).address).toBe(first)
        expect(executorService.get("0x3", testUserAccount.address, 4n).address).toBe(first)
        expect(executorService.stats()).toStrictEqual([
            { address: second, count: 2 },
            { address: first, count: 3 },
        ])
        await sleep(50)
        expect(executorService.get("0x4", testUserAccount.address, 4n).address).toBe(first)
        expect(executorService.stats()).toStrictEqual([
            { address: second, count: 1 },
            { address: first, count: 3 },
        ])
        await sleep(50)
        expect(executorService.get("0x5", testUserAccount.address, 4n).address).toBe(first)
        expect(executorService.stats()).toStrictEqual([
            { address: second, count: 0 },
            { address: first, count: 2 },
        ])
        await sleep(50)
        expect(executorService.stats()).toStrictEqual([
            { address: second, count: 0 },
            { address: first, count: 1 },
        ])
        await sleep(50)
        expect(executorService.stats()).toStrictEqual([
            { address: second, count: 0 },
            { address: first, count: 0 },
        ])
    })
})
