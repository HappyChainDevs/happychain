import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { Boop } from "#lib/types"
import { computeBoopHash } from "#lib/utils/boop"
import { apiClient, createMintBoop, createSmartAccount, getNonce, signBoop } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signBoop(testAccount, tx)

describe("routes: api/submitter", () => {
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
        unsignedTx = createMintBoop({ account, nonceTrack, nonceValue })
        signedTx = await sign(unsignedTx)
    })

    describe("200", () => {
        it("should simulate a tx", async () => {
            const result = await apiClient.api.v1.boop.simulate.$post({ json: { boop: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should execute a tx", async () => {
            const result = await apiClient.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should submit a tx", async () => {
            const result = await apiClient.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
            expect(result.status).toBe(200)
        })
        it("should fetch state by hash", async () => {
            await apiClient.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
            const boopHash = computeBoopHash(env.CHAIN_ID, unsignedTx)
            const result = await apiClient.api.v1.boop.state[":boopHash"].$get({ param: { boopHash } })
            expect(result.status).toBe(200)
        })
        it("should await state receipt by hash", async () => {
            // We can't send the wait at the same time as the submitter rejects if the boop is unknown.
            await apiClient.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
            const boopHash = computeBoopHash(env.CHAIN_ID, unsignedTx)
            const result = await apiClient.api.v1.boop.receipt[":boopHash"].$get({
                param: { boopHash },
                query: { timeout: 2000 },
            })
            expect(result.status).toBe(200)
        })
        it("should fetch pending tx's by account", async () => {
            const result = await apiClient.api.v1.boop.pending[":account"].$get({ param: { account } })
            expect(result.status).toBe(200)
        })
    })
})
