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

describe("submitter_receipt", () => {
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

    it("fetches state of recently completed tx with 0 timeout", async () => {
        const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), signedTx)

        // submit transaction and wait to complete
        await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(signedTx) } })

        const state = (await client.api.v1.boop.receipt[":hash"]
            .$get({ param: { hash: boopHash }, query: { timeout: "0" } })
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.Success)
        expect(state.state.status).toBe(EntryPointStatus.Success)
        expect(state.state.included).toBe(true)
        expect(state.state.receipt.boopHash).toBe(boopHash)
        expect(state.state.simulation).toBeUndefined()
    })

    it("fetches both simulated and resolved states depending on timeout", async () => {
        const boopHash = computeBoopHash(BigInt(env.CHAIN_ID), signedTx)

        // submit transaction but don't wait to complete
        client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(signedTx) } })

        const [stateSimulated, stateResolved] = await Promise.all([
            client.api.v1.boop.receipt[":hash"]
                .$get({ param: { hash: boopHash }, query: { timeout: "100" } }) // return near immediately
                .then((a) => a.json()) as any,
            client.api.v1.boop.receipt[":hash"]
                .$get({ param: { hash: boopHash }, query: { timeout: "2100" } }) // wait 2 seconds to get next block
                .then((a) => a.json()) as any,
        ])

        expect(stateSimulated.status).toBe(StateRequestStatus.Success)
        expect(stateSimulated.state.status).toBe(EntryPointStatus.Success)
        expect(stateSimulated.state.included).toBe(false)
        expect(stateSimulated.state.receipt).toBeUndefined()
        expect(stateSimulated.state.simulation).toBeDefined()

        expect(stateResolved.status).toBe(StateRequestStatus.Success)
        expect(stateResolved.state.status).toBe(EntryPointStatus.Success)
        expect(stateResolved.state.included).toBe(true)
        expect(stateResolved.state.receipt.boopHash).toBe(boopHash)
        expect(stateResolved.state.simulation).toBeUndefined()
    })
})
