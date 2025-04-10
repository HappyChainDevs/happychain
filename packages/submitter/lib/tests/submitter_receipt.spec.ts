import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { app } from "#lib/server"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import { StateRequestStatus } from "#lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import { createMockTokenAMintHappyTx, getNonce, signTx } from "./utils"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: HappyTx) => signTx(testAccount, tx)

describe("submitter_receipt", () => {
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
        signedTx = await sign(unsignedTx)
    })

    it("fetches state of recently completed tx with 0 timeout", async () => {
        const happyTxHash = computeHappyTxHash(signedTx)

        // submit transaction and wait to complete
        await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(signedTx) } })

        const state = (await client.api.v1.submitter.receipt[":hash"]
            .$get({ param: { hash: happyTxHash }, query: { timeout: "0" } })
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.Success)
        expect(state.state.status).toBe(EntryPointStatus.Success)
        expect(state.state.included).toBe(true)
        expect(state.state.receipt.happyTxHash).toBe(happyTxHash)
        expect(state.state.simulation).toBeUndefined()
    })

    it("fetches both simulated and resolved states depending on timeout", async () => {
        const happyTxHash = computeHappyTxHash(signedTx)

        // submit transaction but don't wait to complete
        client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(signedTx) } })

        const [stateSimulated, stateResolved] = await Promise.all([
            client.api.v1.submitter.receipt[":hash"]
                .$get({ param: { hash: happyTxHash }, query: { timeout: "100" } }) // return near immediately
                .then((a) => a.json()) as any,
            client.api.v1.submitter.receipt[":hash"]
                .$get({ param: { hash: happyTxHash }, query: { timeout: "2100" } }) // wait 2 seconds to get next block
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
        expect(stateResolved.state.receipt.happyTxHash).toBe(happyTxHash)
        expect(stateResolved.state.simulation).toBeUndefined()
    })
})
