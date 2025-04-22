import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { computeBoopHash } from "#lib/client"
import { env } from "#lib/env"
import { createMockTokenAMintHappyTx, getNonce, signTx } from "#lib/tests/utils"
import { client } from "#lib/tests/utils/client"
import type { Boop } from "#lib/tmp/interface/Boop"
import { serializeBigInt } from "#lib/utils/serializeBigInt"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("routes: api/submitter", () => {
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
        unsignedTx = createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        signedTx = await sign(unsignedTx)
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
            const hash = computeBoopHash(BigInt(env.CHAIN_ID), unsignedTx)
            const result = await client.api.v1.submitter.state[":hash"].$get({ param: { hash } })
            expect(result.status).toBe(200)
        })
        it("should await state receipt by hash", async () => {
            const hash = computeBoopHash(BigInt(env.CHAIN_ID), unsignedTx)
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
