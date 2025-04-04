import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { computeHappyTxHash } from "#lib/client"
import { app } from "#lib/server"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount } from "#lib/tests/utils"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { serializeBigInt } from "#lib/utils/serializeBigInt"

const client = testClient(app)
describe("routes: api/submitter", () => {
    let smartAccount: `0x${string}`
    let nonceTrack = 0n
    let nonceValue = 0n
    let unsignedTx: HappyTx
    let signedTx: HappyTx

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.address, salt: "0x1" } })
            .then((a) => a.json())
            .then((a) => a.address)
    })

    beforeEach(async () => {
        // Run each tests in isolated nonceTrack
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(smartAccount, nonceTrack)
        unsignedTx = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        signedTx = await signTx(unsignedTx)
    })

    describe("200", () => {
        it("should simulate a tx", async () => {
            const result = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should execute a tx", async () => {
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should submit a tx", async () => {
            const result = await client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should fetch state by hash", async () => {
            await client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(signedTx) } })
            const hash = computeHappyTxHash(unsignedTx)
            const result = await client.api.v1.submitter.state[":hash"].$get({ param: { hash } })
            expect(result.status).toBe(200)
        })
        it("should await state receipt by hash", async () => {
            const hash = computeHappyTxHash(unsignedTx)
            const [result] = await Promise.all([
                client.api.v1.submitter.receipt[":hash"].$get({ param: { hash }, query: { timeout: "2000" } }),
                // don't need results, just need it to complete
                client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(signedTx) } }),
            ])

            expect(result.status).toBe(200)
        })
        it("should fetch pending tx's by account", async () => {
            const result = await client.api.v1.submitter.pending[":account"].$get({ param: { account: smartAccount } })
            expect(result.status).toBe(200)
        })
    })
})
