import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { Boop } from "#lib/interfaces/Boop"
import { StateRequestStatus } from "#lib/interfaces/BoopState"
import { EntryPointStatus } from "#lib/interfaces/status"
import { computeBoopHash } from "#lib/utils/computeBoopHash"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import { createMockTokenAMintBoop, getNonce, signTx } from "./utils"
import { client } from "./utils/client"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_state", () => {
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
        unsignedTx = createMockTokenAMintBoop(smartAccount, nonceValue, nonceTrack)
        signedTx = await sign(unsignedTx)
    })

    it("fetches state of recent tx", async () => {
        // submit all transactions, but only wait for the first to complete
        const response = (await client.api.v1.boop.execute
            .$post({ json: { tx: serializeBigInt(signedTx) } })
            .then((a) => a.json())) as any

        const state = (await client.api.v1.boop.state[":hash"]
            .$get({ param: { hash: response.state.receipt.boopHash } })
            .then((a) => a.json())) as any

        expect(response.error).toBeUndefined()
        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.Success)
        expect(state.state.status).toBe(EntryPointStatus.Success)
        expect(state.state.included).toBe(true)
        expect(state.state.receipt.boopHash).toBe(response.state.receipt.boopHash)
        expect(state.state.simulation).toBeUndefined()
    })

    it("fetches state of an unknown tx", async () => {
        const state = (await client.api.v1.boop.state[":hash"]
            .$get({ param: { hash: smartAccount } })
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.UnknownBoop)
        expect(state.state).toBeUndefined()
    })

    it("fetches state of simulated (unconfirmed) future tx", async () => {
        const nonce = nonceValue + 1n // future nonce so that is submits, but doesn't finalize
        const futureUnsignedTx = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)
        const futureSignedTx = await sign(futureUnsignedTx)
        const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), futureSignedTx)
        // submit transaction, but don't wait for it to complete
        const blockedTx = client.api.v1.boop.submit.$post({ json: { tx: serializeBigInt(futureSignedTx) } })

        await new Promise((resolve) => setTimeout(resolve, 100))

        const state = (await client.api.v1.boop.state[":hash"]
            .$get({ param: { hash: boopHash } })
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.Success)
        expect(state.state.status).toBe(EntryPointStatus.Success)
        expect(state.state.included).toBe(false)
        expect(state.state.receipt).toBeUndefined()
        expect(state.state.simulation).toBeDefined()

        await client.api.v1.boop.submit.$post({ json: { tx: serializeBigInt(signedTx) } })
        await blockedTx // wait for the transaction to complete so CI isn't grumpy
    })
})
