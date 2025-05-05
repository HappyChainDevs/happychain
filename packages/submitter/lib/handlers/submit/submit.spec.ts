import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import { type Boop, Onchain } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { client, createMockTokenAMintBoop, createSmartAccount, getNonce, signTx } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_submit", () => {
    let smartAccount: Address
    let nonceTrack = 0n
    let nonceValue = 0n
    let unsignedTx: Boop
    let signedTx: Boop

    beforeAll(async () => {
        smartAccount = await createSmartAccount(testAccount.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(smartAccount, nonceTrack)
        unsignedTx = createMockTokenAMintBoop(smartAccount, nonceValue, nonceTrack)
        signedTx = await sign(unsignedTx)
    })

    it("submits 'mint token' tx successfully.", async () => {
        const result = await client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
        const response = (await result.json()) as any
        expect(result.status).toBe(200)
        expect(response.status).toBe(Onchain.Success)
        expect((response as { hash: string }).hash).toBeString()
    })

    it("submits 50 'mint token' tx's quickly and successfully.", async () => {
        if (env.AUTOMINE_TESTS) return console.log("Skipping test because automine is enabled")
        const count = 50
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonce) => {
                const dummyBoop = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)
                return await sign(dummyBoop)
            }),
        )

        const results = await Promise.all(
            transactions.map((tx) => client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(tx) } })),
        ).then(async (a) => await Promise.all(a.map((b) => b.json() as any)))

        const rs = await Promise.all(
            results.map((a) => {
                if (a.status !== Onchain.Success) return { status: a.status }
                return publicClient.waitForTransactionReceipt({ hash: a.txHash, pollingInterval: 100 })
            }),
        )

        expect(results.length).toBe(count)
        expect(results.every((r) => r.status === Onchain.Success)).toBe(true)
        expect(rs.length).toBe(count)
        expect(rs.every((r) => r.status === "success")).toBe(true)
    })
})
