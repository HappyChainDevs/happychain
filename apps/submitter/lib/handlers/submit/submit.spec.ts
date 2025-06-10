// proxy HAS TO BE IMPORTED FIRST so that it starts before submitter starts!
import "#lib/utils/test/proxyServer"
import { computeBoopHash } from "#lib/utils/boop"

import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { SubmitError, SubmitSuccess } from "#lib/handlers/submit"
import { type Boop, type BoopReceipt, Onchain, SubmitterError } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { assertMintLog, client, createMintBoop, createSmartAccount, getNonce, signBoop } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signBoop(testAccount, tx)

describe("submitter_submit", () => {
    let account: Address
    let nonceTrack = 0n
    let nonceValue = 0n
    let unsignedTx: Boop
    let signedTx: Boop

    beforeAll(async () => {
        account = await createSmartAccount(testAccount.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(account, nonceTrack)
        unsignedTx = createMintBoop({ account, nonceValue, nonceTrack })
        signedTx = await sign(unsignedTx)
    })

    it("submits 'mint token' tx successfully.", async () => {
        const result = await client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
        const response = (await result.json()) as unknown as SubmitSuccess
        expect(result.status).toBe(200)
        expect(response.status).toBe(Onchain.Success)
        expect((response as { boopHash: string }).boopHash).toBeString()
    })

    it("rejects submission with the same nonce but different content", async () => {
        // First submit a transaction
        const firstResult = await client.api.v1.boop.submit.$post({
            json: { boop: serializeBigInt(signedTx) },
        })
        const firstResponse = (await firstResult.json()) as unknown as SubmitSuccess

        expect(firstResult.status).toBe(200)
        expect(firstResponse.status).toBe(Onchain.Success)

        // Create a different transaction with the same account/nonceTrack/nonceValue
        const differentTx = createMintBoop({
            account,
            nonceValue,
            nonceTrack,
            amount: 2000000000000000000n, // 2 ETH instead of the default 1 ETH, to differentiate from the first boop
        })
        const signedDifferentTx = await signBoop(testAccount, differentTx)

        // Try to submit the second transaction
        const secondResult = await client.api.v1.boop.submit.$post({
            json: { boop: serializeBigInt(signedDifferentTx) },
        })
        const secondResponse = (await secondResult.json()) as unknown as SubmitError

        // Expect rejection due to duplicate nonce
        expect(secondResult.status).toBe(422) // Status 422 is Unprocessable Entity
        expect(secondResponse.status).toBe(SubmitterError.AlreadyProcessing)
        expect(secondResponse.error).toContain("same account and nonce")
    })

    // biome-ignore format: keep indentation low
    it("submits 50 'mint token' tx's quickly and successfully.", async () => {
        const count = 50
        // test only works if submitter is configured to allow more than 50
        expect(env.MAX_BLOCKED_PER_TRACK).toBeGreaterThanOrEqual(count)
        expect(env.MAX_TOTAL_BLOCKED).toBeGreaterThanOrEqual(count)

        const boops = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonceValue) => {
                const dummyBoop = createMintBoop({ account, nonceValue, nonceTrack })
                return await sign(dummyBoop)
            }),
        )

        const submitResults = await Promise.all(
            boops.map((tx) => client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(tx) } })),
        ).then(async (a) => await Promise.all(a.map((b) => b.json() as any)))

        const receipts = await Promise.all(
            submitResults.map((a) => {
                if (a.status !== Onchain.Success) return { status: a.status }
                return client.api.v1.boop.receipt[":boopHash"].$get({
                    param: { boopHash: a.boopHash },
                    query: { timeout: 10_000 },
                })
            }),
        )
        const receiptBodies = await Promise.all(
            receipts.map(async (resp) => {
                // If resp is already an object (not a Response), just return it
                if (resp && "json" in resp && typeof resp.json === "function") {
                    return await resp.json()
                }
                return resp
            }),
        )
        const rs = await Promise.all(
            receiptBodies.map((a) => {
                if (a.status !== Onchain.Success) return { status: a.status }
                if (!("receipt" in a)) return { status: a.status }
                assertMintLog(a.receipt as BoopReceipt, account)
                const receipt = a.receipt as { evmTxHash: `0x${string}` }
                return publicClient.getTransactionReceipt({ hash: receipt.evmTxHash })
            }),
        )

        expect(submitResults.length).toBe(count)
        expect(submitResults.every((r) => r.status === Onchain.Success)).toBe(true)
        expect(rs.length).toBe(count)
        rs.forEach((r, i) => expect(r.status, `boop with hash ${computeBoopHash(env.CHAIN_ID, boops[i])}`).toBe("success"))
    })
})
