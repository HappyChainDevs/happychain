import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import type { Address } from "@happy.tech/common"
import { serializeBigInt, sleep } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { deployment, env } from "#lib/env"
import { GetPending, type GetPendingSuccess } from "#lib/handlers/getPending/types"
import type { Boop } from "#lib/types"
import { apiClient, createMintBoop, createSmartAccount, getNonce, signBoop, withInterval } from "#lib/utils/test"

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

    // biome-ignore format: keep indentation low
    it("fetches pending boops for a user", withInterval(1, true, async () => {
        const count = 10

        // test only works if submitter is configured to allow more than 50
        expect(env.MAX_BLOCKED_PER_TRACK).toBeGreaterThanOrEqual(count)
        expect(env.MAX_TOTAL_BLOCKED).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonceValue) => {
                const dummyBoop = createMintBoop({ account, nonceValue, nonceTrack })
                return await sign(dummyBoop)
            }),
        )

        await Promise.all(
            transactions.map((tx) => apiClient.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(tx) } })),
        )

        const pending = (await apiClient.api.v1.boop.pending[":account"]
            .$get({ param: { account: account } })
            .then((a) => a.json())) as GetPendingSuccess
        expect(pending.status).toBe(GetPending.Success)
        expect(pending.pending.length).toBeGreaterThanOrEqual(5)
        expect(pending.pending[0].boopHash).toBeString()
        expect(pending.pending[0].entryPoint).toBe(deployment.EntryPoint)
        expect(BigInt(pending.pending[0].nonceTrack)).toBeGreaterThanOrEqual(0n)
        expect(BigInt(pending.pending[0].nonceValue)).toBeGreaterThanOrEqual(0n)
    }))

    // biome-ignore format: keep indentation low
    it("nothing pends after execute completes", withInterval(1, true, async () => {
        const count = 10

        // test only works if submitter is configured to allow more than 50
        expect(env.MAX_BLOCKED_PER_TRACK).toBeGreaterThanOrEqual(count)
        expect(env.MAX_TOTAL_BLOCKED).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonceValue) => {
                const dummyBoop = createMintBoop({ account, nonceValue, nonceTrack })
                return await sign(dummyBoop)
            }),
        )

        // wait for execution, so nothing should pend
        await Promise.all(
            transactions.map((tx) => apiClient.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(tx) } })),
        )

        const pending = (await apiClient.api.v1.boop.pending[":account"]
            .$get({ param: { account: account } })
            .then((a) => a.json())) as GetPendingSuccess
        expect(pending.status).toBe(GetPending.Success)

        // Give it some slack to avoid flaking.
        expect(pending.pending.length).toBeLessThan(3)
        // But then check that the pend goes away.
        if (pending.pending.length > 0) {
            await sleep(1000)
            const pending = (await apiClient.api.v1.boop.pending[":account"]
                .$get({ param: { account: account } })
                .then((a) => a.json())) as GetPendingSuccess
            expect(pending.status).toBe(GetPending.Success)
            expect(pending.pending.length).toBe(0)
        }
    }))
})
