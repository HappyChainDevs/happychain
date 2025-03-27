import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import env from "#lib/env"
import { app } from "#lib/server"
import { SubmitSuccess } from "#lib/tmp/interface/submitter_submit"
import { serializeBigInt } from "#lib/utils/bigint-lossy"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount, testPublicClient } from "./utils"

const client = testClient(app)

// use random nonce track so that other tests can't interfere
const nonceTrack = BigInt(Math.floor(Math.random() * 1000000))

describe("submitter_submit", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.account.address, salt: "0x1" } })
            .then((a) => a.json())
            .then((a) => a.address)
    })

    it("submits mints token tx.", async () => {
        const nonceTrackAlt = nonceTrack + 1n
        const nonce = await getNonce(smartAccount, nonceTrackAlt)
        const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrackAlt)

        const prepared = await signTx(dummyHappyTx)
        const result = await client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(prepared) } })
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const response = (await result.json()) as any
        expect(result.status).toBe(200)
        expect(response.status).toBe(SubmitSuccess)
        expect((response as { hash: string }).hash).toBeString()
    })

    it("submits 50 mints token tx quickly.", async () => {
        const startingNonce = await getNonce(smartAccount, nonceTrack)
        const count = 50
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + startingNonce).map(async (nonce) => {
                const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
                return await signTx(dummyHappyTx)
            }),
        )

        const results = await Promise.all(
            transactions.map((tx) => client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx) } })),
        ).then(async (a) => await Promise.all(a.map((b) => b.json())))

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

    // Skipped: very flakey due to timing issues
    it.skip("replaces tx with the most recent one", async () => {
        const startingNonce = await getNonce(smartAccount, nonceTrack)
        const count = 50
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const tx0 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 0n, nonceTrack))
        const tx1 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 1n, nonceTrack))
        const tx2 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 2n, nonceTrack))
        const tx3 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 3n, nonceTrack))
        const tx4 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 4n, nonceTrack))
        const tx5 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 5n, nonceTrack))
        const tx6 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 6n, nonceTrack))
        const tx7 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 7n, nonceTrack))
        const tx8 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 8n, nonceTrack))
        const tx9 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 9n, nonceTrack))
        const tx9_2 = await signTx(await createMockTokenAMintHappyTx(smartAccount, startingNonce + 9n, nonceTrack)) // 9 again!

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
        const tx9_2_request = client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx9_2) } })

        const tx0_response = await tx0_request

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

        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const rejection = (await tx9_response.json()) as any

        expect(tx0_response.status).toBe(200)
        expect(tx1_response.status).toBe(200)
        expect(tx2_response.status).toBe(200)
        expect(tx3_response.status).toBe(200)
        expect(tx4_response.status).toBe(200)
        expect(tx5_response.status).toBe(200)
        expect(tx6_response.status).toBe(200)
        expect(tx7_response.status).toBe(200)
        expect(tx8_response.status).toBe(200)
        expect(tx9_response.status).toBe(500)

        expect(tx9_2_response.status).toBe(200) // replaced!

        expect(rejection.error).toBe("transaction rejected")
    })
})
