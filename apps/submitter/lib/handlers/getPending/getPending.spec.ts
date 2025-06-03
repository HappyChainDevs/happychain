import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import type { Address } from "@happy.tech/common"
import { serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { Boop } from "#lib/types"
import { client, createMintBoop, createSmartAccount, getNonce, signBoop } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signBoop(testAccount, tx)

describe("submitter_pending", () => {
    let account: Address
    let nonceTrack = 0n
    let nonceValue = 0n

    beforeAll(async () => {
        account = await createSmartAccount(testAccount.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(account, nonceTrack)
    })

    it("fetches pending boops for a user", async () => {
        if (env.AUTOMINE_TESTS) return console.log("Skipping test because automine is enabled")

        const count = 10

        // test only works if submitter is configured to allow more than 50
        expect(env.MAX_PENDING_PER_TRACK).toBeGreaterThanOrEqual(count)
        expect(env.MAX_TOTAL_PENDING).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonceValue) => {
                const dummyBoop = createMintBoop({ account, nonceValue, nonceTrack })
                return await sign(dummyBoop)
            }),
        )

        // TODO retry with execute and make sure it doesn't work
        // wait for all to be submitted, but not executed, with a 2s block time they should all pend
        await Promise.all(
            transactions.map((tx) => client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(tx) } })),
        )

        const pending = (await client.api.v1.boop.pending[":account"]
            .$get({ param: { account: account } })
            .then((a) => a.json())) as any
        expect(pending.error).toBeUndefined()
        expect(pending.pending.length).toBeGreaterThanOrEqual(5)
        expect(pending.pending[0].boopHash).toBeString()
        expect(BigInt(pending.pending[0].nonceTrack)).toBeGreaterThanOrEqual(0n)
        expect(BigInt(pending.pending[0].nonceValue)).toBeGreaterThanOrEqual(0n)
    })
})
