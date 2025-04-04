import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { app } from "#lib/server"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { StateRequestStatus } from "#lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount } from "./utils"

describe("submitter_state", () => {
    const client = testClient(app)
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
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(smartAccount, nonceTrack)
        unsignedTx = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        signedTx = await signTx(unsignedTx)
    })

    it("fetches state of recent tx", async () => {
        // submit all transactions, but only wait for the first to complete
        const response = (await client.api.v1.submitter.execute
            .$post({ json: { tx: serializeBigInt(signedTx) } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a) => a.json())) as any

        const state = (await client.api.v1.submitter.state[":hash"]
            .$get({ param: { hash: response.state.receipt.happyTxHash } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a) => a.json())) as any

        expect(response.error).toBeUndefined()
        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.Success)
        expect(state.state.status).toBe(EntryPointStatus.Success)
        expect(state.state.included).toBe(true)
        expect(state.state.receipt.happyTxHash).toBe(response.state.receipt.happyTxHash)
        expect(state.state.simulation).toBeUndefined()
    })

    it("fetches state of an unknown tx", async () => {
        const state = (await client.api.v1.submitter.state[":hash"]
            .$get({ param: { hash: smartAccount } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.UnknownHappyTx)
        expect(state.state).toBeUndefined()
    })

    it("fetches state of simulated (unconfirmed) future tx", async () => {
        const nonce = nonceValue + 5n // future nonce so that is submits, but doesn't finalize
        const unsignedTx = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
        const signedTx = await signTx(unsignedTx)
        const happyTxHash = computeHappyTxHash(signedTx)
        // submit transaction, but don't wait for it to complete
        client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(signedTx) } }).then((a) => a.json())

        await new Promise((resolve) => setTimeout(resolve, 100))

        const state = (await client.api.v1.submitter.state[":hash"]
            .$get({ param: { hash: happyTxHash } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.Success)
        expect(state.state.status).toBe(EntryPointStatus.Success)
        expect(state.state.included).toBe(false)
        expect(state.state.receipt).toBeUndefined()
        expect(state.state.simulation).toBeDefined()
    })
})
