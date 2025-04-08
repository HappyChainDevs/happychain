import { describe, expect, it, mock } from "bun:test"
import { createTestAccount } from "#src/tests/utils"
import type { HappyTx } from "#src/tmp/interface/HappyTx"
import { NonceQueueManager } from "./nonceQueueManager"

// user 1
const u1 = createTestAccount()
const u1_0_0 = u1.createHappyTx() // user 1, track 0
const u1_0_1 = u1.createHappyTx() // user 1, track 0
const u1_0_2 = u1.createHappyTx() // user 1, track 0
const u1_0_3 = u1.createHappyTx() // user 1, track 0

// user 2
const u2 = createTestAccount()
const u2_0_0 = u2.createHappyTx() // user 2, track 0
const u2_0_1 = u2.createHappyTx() // user 2, track 0
const u2_1_0 = u2.createHappyTx(1n) // user 2, track 1

const mockFastProcessor = mock(async (args: HappyTx) => args)
const mockGetNonce = mock(async () => 0n)

describe("submitter", () => {
    it("should resolve users limits in order", async () => {
        const manager = new NonceQueueManager(10, 10, mockFastProcessor, mockGetNonce)

        const [a1, a3, a2, b0, c1, c0, a0] = await Promise.all([
            manager.enqueueBuffer(u1_0_1),
            manager.enqueueBuffer(u1_0_3),
            manager.enqueueBuffer(u1_0_2),
            manager.enqueueBuffer(u2_1_0),
            manager.enqueueBuffer(u2_0_1),
            manager.enqueueBuffer(u2_0_0),
            manager.enqueueBuffer(u1_0_0),
        ])

        expect(a0).toStrictEqual(u1_0_0)
        expect(a1).toStrictEqual(u1_0_1)
        expect(a2).toStrictEqual(u1_0_2)
        expect(a3).toStrictEqual(u1_0_3)
        expect(b0).toStrictEqual(u2_1_0)
        expect(c0).toStrictEqual(u2_0_0)
        expect(c1).toStrictEqual(u2_0_1)
    })

    it("should reject a users buffer overflow", async () => {
        const manager = new NonceQueueManager(
            2,
            100,
            async () => new Promise((resolve) => setTimeout(resolve, 500)),
            mockGetNonce,
        )

        manager.enqueueBuffer(u1_0_0)
        manager.enqueueBuffer(u1_0_1)

        expect(() => manager.enqueueBuffer(u1_0_2)).toThrowError("bufferExceeded")
    })

    it("should prune most active user when capacity reached", async () => {
        const manager = new NonceQueueManager(4, 4, mockFastProcessor, mockGetNonce)

        const [a, b, c, d, e] = await Promise.allSettled([
            // user 1 fills all capacity
            manager.enqueueBuffer(u1_0_0),
            manager.enqueueBuffer(u1_0_1),
            manager.enqueueBuffer(u1_0_2),
            manager.enqueueBuffer(u1_0_3),
            // second user will prune user 1 as its the
            // most active, to make room for more users
            manager.enqueueBuffer(u2_0_0),
        ])

        // user 1's first tx is success
        expect(a.status).toBe("fulfilled")
        expect(a.status === "fulfilled" && a.value).toBe(u1_0_0)
        // the rest of user 1s tx's are pruned to make room for more users
        expect(b.status).toBe("rejected")
        expect(b.status === "rejected" && b.reason.message).toBe("bufferPrunedDueToCapacityLimit")
        expect(c.status).toBe("rejected")
        expect(c.status === "rejected" && c.reason.message).toBe("bufferPrunedDueToCapacityLimit")
        expect(d.status).toBe("rejected")
        expect(d.status === "rejected" && d.reason.message).toBe("bufferPrunedDueToCapacityLimit")

        // user 2 succeeds
        expect(e.status).toBe("fulfilled")
        expect(e.status === "fulfilled" && e.value).toBe(u2_0_0)
    })

    it("should throw if a nonce is used outside of configured constraints", async () => {
        const manager = new NonceQueueManager(4, 4, mockFastProcessor, mockGetNonce)

        const [a, b] = await Promise.allSettled([
            // nonce 0, should be fine
            manager.enqueueBuffer(u1_0_0),
            // nonce 100 should be error
            manager.enqueueBuffer({ account: u1.account.address, nonceTrack: 1n, nonceValue: 100n }),
        ])

        // user 1's first tx is success
        expect(a.status).toBe("fulfilled")
        expect(a.status === "fulfilled" && a.value).toBe(u1_0_0)
        // the rest of user 1s tx's are pruned to make room for more users
        expect(b.status).toBe("rejected")
        expect(b.status === "rejected" && b.reason.message).toBe("Nonce out of range")
    })
})
