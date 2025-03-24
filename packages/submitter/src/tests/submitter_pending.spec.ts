import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import env from "#src/env"
import { app } from "#src/server"
import { serializeBigInt } from "#src/utils/bigint-lossy"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount } from "./utils"

const client = testClient(app)

// use random nonce track so that other tests can't interfere
const nonceTrack = BigInt(Math.floor(Math.random() * 1000000))

describe("submitter_pending", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.account.address, salt: "0x1" } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.json())
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.address)
    })

    it("fetches pending transactions for a user", async () => {
        const startingNonce = await getNonce(smartAccount, nonceTrack)

        const count = 10
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + startingNonce).map(async (nonce) => {
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
