import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import { computeBoopHash } from "#lib/services"
import type { Boop } from "#lib/types"
import { client, createMockTokenAMintBoop, createSmartAccount, getNonce, signTx } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("routes: api/submitter", () => {
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

    describe("200", () => {
        it("should simulate a tx", async () => {
            const result = await client.api.v1.boop.simulate.$post({ json: { boop: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should execute a tx", async () => {
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should submit a tx", async () => {
            const result = await client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should fetch state by hash", async () => {
            await client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
            const hash = computeBoopHash(BigInt(env.CHAIN_ID), unsignedTx)
            const result = await client.api.v1.boop.state[":hash"].$get({ param: { hash } })
            expect(result.status).toBe(200)
        })
        it("should await state receipt by hash", async () => {
            const hash = computeBoopHash(BigInt(env.CHAIN_ID), unsignedTx)
            const [result] = await Promise.all([
                client.api.v1.boop.receipt[":hash"].$get({ param: { hash }, query: { timeout: "2000" } }),
                // don't need results, just need it to complete
                client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } }),
            ])

            expect(result.status).toBe(200)
        })
        it("should fetch pending tx's by account", async () => {
            const result = await client.api.v1.boop.pending[":account"].$get({ param: { account: smartAccount } })
            expect(result.status).toBe(200)
        })
    })
})
