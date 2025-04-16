import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import env from "#lib/env"
import { app } from "#lib/server"
import type { Boop } from "#lib/tmp/interface/Boop"
import { SubmitSuccess } from "#lib/tmp/interface/submitter_submit"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import { createMockTokenAMintHappyTx, getNonce, signTx, testPublicClient } from "./utils"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_submit", () => {
    const client = testClient(app)
    let smartAccount: `0x${string}`
    let nonceTrack = 0n
    let nonceValue = 0n
    let unsignedTx: Boop
    let signedTx: Boop

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.address, salt: "0x1" } })
            .then((a) => a.json())
            .then((a) => a.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(smartAccount, nonceTrack)
        unsignedTx = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        signedTx = await sign(unsignedTx)
    })

    it("submits 'mint token' tx successfully.", async () => {
        const result = await client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(signedTx) } })
        const response = (await result.json()) as any
        expect(result.status).toBe(200)
        expect(response.status).toBe(SubmitSuccess)
        expect((response as { hash: string }).hash).toBeString()
    })

    it("submits 50 'mint token' tx's quickly and successfully.", async () => {
        const count = 50
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonce) => {
                const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
                return await sign(dummyHappyTx)
            }),
        )

        const results = await Promise.all(
            transactions.map((tx) => client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx) } })),
        ).then(async (a) => await Promise.all(a.map((b) => b.json() as any)))

        const rs = await Promise.all(
            results.map((a) => {
                if (a.status !== SubmitSuccess) return { status: a.status }
                return testPublicClient.waitForTransactionReceipt({ hash: a.hash, pollingInterval: 100 })
            }),
        )

        expect(results.length).toBe(count)
        expect(results.every((r) => r.status === SubmitSuccess)).toBe(true)
        expect(rs.length).toBe(count)
        expect(rs.every((r) => r.status === "success")).toBe(true)
    })

    // can be skipped: very flakey due to timing issues
    it("replaces tx with the most recent one", async () => {
        const count = 50
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const tx0 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 0n, nonceTrack))
        const tx1 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 1n, nonceTrack))
        const tx2 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 2n, nonceTrack))
        const tx3 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 3n, nonceTrack))
        const tx4 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 4n, nonceTrack))
        const tx5 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 5n, nonceTrack))
        const tx6 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 6n, nonceTrack))
        const tx7 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 7n, nonceTrack))
        const tx8 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 8n, nonceTrack))
        const tx9 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 9n, nonceTrack))
        const tx9_2 = await sign(await createMockTokenAMintHappyTx(smartAccount, nonceValue + 9n, nonceTrack)) // 9 again!

        // submit all transactions without waiting
        const tx0_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx0) } })
        const tx1_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx1) } })
        const tx2_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx2) } })
        const tx3_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx3) } })
        const tx4_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx4) } })
        const tx5_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx5) } })
        const tx6_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx6) } })
        const tx7_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx7) } })
        const tx8_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx8) } })
        const tx9_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx9) } })

        // wait for the first transaction to be processed
        // to be sure there is a queue
        const tx0_response = await tx0_request

        // Submit a replacement for tx9
        const tx9_2_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx9_2) } })

        const [
            tx1_response,
            tx2_response,
            tx3_response,
            tx4_response,
            tx5_response,
            tx6_response,
            tx7_response,
            tx8_response,
            tx9_response,
            tx9_2_response,
        ] = await Promise.all([
            tx1_request,
            tx2_request,
            tx3_request,
            tx4_request,
            tx5_request,
            tx6_request,
            tx7_request,
            tx8_request,
            tx9_request,
            tx9_2_request,
        ])

        const tx9_rejection = (await tx9_response.json()) as any

        expect(tx0_response.status).toBe(200)
        expect(tx1_response.status).toBe(200)
        expect(tx2_response.status).toBe(200)
        expect(tx3_response.status).toBe(200)
        expect(tx4_response.status).toBe(200)
        expect(tx5_response.status).toBe(200)
        expect(tx6_response.status).toBe(200)
        expect(tx7_response.status).toBe(200)
        expect(tx8_response.status).toBe(200)

        expect(tx9_response.status).toBe(422) // replaced!
        expect(tx9_2_response.status).toBe(200)
        expect(tx9_rejection.message).toBe("transaction replaced")
    })
})
