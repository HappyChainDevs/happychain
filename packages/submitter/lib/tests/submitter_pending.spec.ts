import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import env from "#lib/env"
import { app } from "#lib/server"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount } from "./utils"

describe("submitter_pending", () => {
    const client = testClient(app)
    let smartAccount: `0x${string}`
    let nonceTrack = 0n
    let nonceValue = 0n

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.address, salt: "0x1" } })
            .then((a) => a.json())
            .then((a) => a.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(smartAccount, nonceTrack)
    })

    it("fetches pending transactions for a user", async () => {
        const count = 10

        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonce) => {
                const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
                return await signTx(dummyHappyTx)
            }),
        )

        // submit all transactions, but only wait for the first to complete
        await Promise.race(
            transactions.map((tx) => client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx) } })),
        )

        const pending = (await client.api.v1.submitter.pending[":account"]
            .$get({ param: { account: smartAccount } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a) => a.json())) as any

        expect(pending.error).toBeUndefined()
        expect(pending.pending.length).toBeGreaterThanOrEqual(5)
        expect(pending.pending[0].hash).toBeString()
        expect(BigInt(pending.pending[0].nonceTrack)).toBeGreaterThanOrEqual(0n)
        expect(BigInt(pending.pending[0].nonceValue)).toBeGreaterThanOrEqual(0n)
    })
})
