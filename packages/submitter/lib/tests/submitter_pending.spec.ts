import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { Boop } from "#lib/interfaces/Boop"
import { createMockTokenAMintBoop, getNonce, signTx } from "./utils"
import { client } from "./utils/client"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_pending", () => {
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
                const dummyBoop = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)
                return await sign(dummyBoop)
            }),
        )

        // submit all transactions, but only wait for the first to complete
        await Promise.race(
            transactions.map((tx) => client.api.v1.boop.submit.$post({ json: { tx: serializeBigInt(tx) } })),
        )

        const pending = (await client.api.v1.boop.pending[":account"]
            .$get({ param: { account: smartAccount } })
            .then((a) => a.json())) as any

        expect(pending.error).toBeUndefined()
        expect(pending.pending.length).toBeGreaterThanOrEqual(5)
        expect(pending.pending[0].hash).toBeString()
        expect(BigInt(pending.pending[0].nonceTrack)).toBeGreaterThanOrEqual(0n)
        expect(BigInt(pending.pending[0].nonceValue)).toBeGreaterThanOrEqual(0n)
    })
})
