import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import type { Address } from "@happy.tech/common"
import { serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { Boop } from "#lib/types"
import { client, createMockTokenAMintBoop, createSmartAccount, getNonce, signTx } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_pending", () => {
    let smartAccount: Address
    let nonceTrack = 0n
    let nonceValue = 0n

    beforeAll(async () => {
        smartAccount = await createSmartAccount(testAccount.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(smartAccount, nonceTrack)
    })

    // TODO: Temporarily skipped: pending should return both the "blocked" boops (awaiting submission) and the "pending"
    //       boops (awaiting receipts). Tracked in HAPPY-573.
    it.skip("fetches pending boops for a user", async () => {
        if (env.AUTOMINE_TESTS) return console.log("Skipping test because automine is enabled")

        const count = 10

        // test only works if submitter is configured to allow more than 50
        expect(env.MAX_PENDING_PER_TRACK).toBeGreaterThanOrEqual(count)
        expect(env.MAX_TOTAL_PENDING).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonce) => {
                const dummyBoop = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)
                return await sign(dummyBoop)
            }),
        )

        // TODO retry with execute and make sure it doesn't work
        // wait for all to be submitted, but not executed, with a 2s block time they should all pend
        await Promise.all(
            transactions.map((tx) => client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(tx) } })),
        )

        const pending = (await client.api.v1.boop.pending[":account"]
            .$get({ param: { account: smartAccount } })
            .then((a) => a.json())) as any
        expect(pending.error).toBeUndefined()
        expect(pending.pending.length).toBeGreaterThanOrEqual(5)
        expect(pending.pending[0].boopHash).toBeString()
        expect(BigInt(pending.pending[0].nonceTrack)).toBeGreaterThanOrEqual(0n)
        expect(BigInt(pending.pending[0].nonceValue)).toBeGreaterThanOrEqual(0n)
    })
})
