import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import type { Address } from "@happy.tech/common"
import { serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { ExecuteSuccess } from "#lib/handlers/execute"
import { computeBoopHash } from "#lib/services/computeBoopHash"
import type { Boop } from "#lib/types"
import { Onchain } from "#lib/types"
import { client, createMockTokenAMintBoop, createSmartAccount, getNonce, signTx } from "#lib/utils/test"
import { GetState, type GetStateReceipt, type GetStateSimulated, type GetStateUnknown } from "./types"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_state", () => {
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

    it("fetches state of recent tx", async () => {
        // submit all transactions, but only wait for the first to complete
        const response = (await client.api.v1.boop.execute
            .$post({ json: { boop: serializeBigInt(signedTx) } })
            .then((a) => a.json())) as ExecuteSuccess
        expect(response.status).toBe(Onchain.Success)
        expect(response.receipt).toBeDefined()
        const state = (await client.api.v1.boop.state[":hash"]
            .$get({ param: { hash: response.receipt.boopHash } })
            .then((a) => a.json())) as GetStateReceipt
        expect(state.status).toBe(GetState.Receipt)
        expect(state.receipt.boopHash).toBe(response.receipt.boopHash)
        expect((state as any).simulation).toBeUndefined()
    })

    it("fetches state of an unknown tx", async () => {
        const state = (await client.api.v1.boop.state[":hash"]
            .$get({ param: { hash: smartAccount } })
            .then((a) => a.json())) as GetStateUnknown
        expect(state.status).toBe(GetState.UnknownBoop)
    })

    it("fetches state of simulated (unconfirmed) future tx", async () => {
        const nonce = nonceValue + 1n // future nonce so that is submits, but doesn't finalize
        const futureUnsignedTx = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)
        const futureSignedTx = await sign(futureUnsignedTx)
        const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), futureSignedTx)
        // submit transaction, but don't wait for it to complete
        const blockedTx = client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(futureSignedTx) } })

        await new Promise((resolve) => setTimeout(resolve, 100))

        const state = (await client.api.v1.boop.state[":hash"]
            .$get({ param: { hash: boopHash } })
            .then((a) => a.json())) as GetStateSimulated

        expect(state.status).toBe(GetState.Simulated)
        expect(state.simulation).toBeDefined()
        expect((state as any).receipt).toBeUndefined()

        await client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
        await blockedTx // wait for the transaction to complete so CI isn't grumpy
    })
})
