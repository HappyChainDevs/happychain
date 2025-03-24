import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { app } from "#lib/server"
import { StateRequestStatus } from "#lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { serializeBigInt } from "#lib/utils/bigint-lossy"
import { computeHappyTxHash } from "#lib/utils/getHappyTxHash"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount } from "./utils"

const client = testClient(app)

// use random nonce track so that other tests can't interfere
const nonceTrack = BigInt(Math.floor(Math.random() * 1000000))

describe("submitter_receipt", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.account.address, salt: "0x1" } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.json())
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.address)
    })

    it("fetches state of recently completed tx with 0 timeout", async () => {
        const nonce = await getNonce(smartAccount, nonceTrack)

        const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
        const tx = await signTx(unsigned)
        const happyTxHash = computeHappyTxHash(tx)

        // submit transaction and wait to complete
        await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(tx) } })

        const state = (await client.api.v1.submitter.receipt[":hash"]
            .$get({ param: { hash: happyTxHash }, query: { timeout: "0" } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.Success)
        expect(state.state.status).toBe(EntryPointStatus.Success)
        expect(state.state.included).toBe(true)
        expect(state.state.receipt.happyTxHash).toBe(happyTxHash)
        expect(state.state.simulation).toBeUndefined()
    })

    it("fetches both simulated and resolved states depending on timeout", async () => {
        const nonce = await getNonce(smartAccount, nonceTrack)
        const tx = await signTx(await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)) // create future tx
        const happyTxHash = computeHappyTxHash(tx)

        // submit transaction but don't wait to complete
        client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(tx) } })

        const [stateSimulated, stateResolved] = await Promise.all([
            client.api.v1.submitter.receipt[":hash"]
                .$get({ param: { hash: happyTxHash }, query: { timeout: "100" } }) // return near immediately
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                .then((a) => a.json()) as any,
            client.api.v1.submitter.receipt[":hash"]
                .$get({ param: { hash: happyTxHash }, query: { timeout: "2100" } }) // wait 2 seconds to get next block
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
