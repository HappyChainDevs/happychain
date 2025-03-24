import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { app } from "#src/server"
import { StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { serializeBigInt } from "#src/utils/bigint-lossy"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount } from "./utils"

const client = testClient(app)

// use random nonce track so that other tests can't interfere
const nonceTrack = BigInt(Math.floor(Math.random() * 1000000))

describe("submitter_state", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.account.address, salt: "0x1" } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.json())
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.address)
    })

    it("fetches state of recent tx", async () => {
        const nonce = await getNonce(smartAccount, nonceTrack)

        const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
        const tx = await signTx(unsigned)

        // submit all transactions, but only wait for the first to complete
        const response = (await client.api.v1.submitter.execute
            .$post({ json: { tx: serializeBigInt(tx) } })
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

    it("fetches state of recent tx", async () => {
        const state = (await client.api.v1.submitter.state[":hash"]
            .$get({ param: { hash: smartAccount } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a) => a.json())) as any

        expect(state.error).toBeUndefined()
        expect(state.status).toBe(StateRequestStatus.UnknownHappyTx)
        expect(state.state).toBeUndefined()
    })

    it("fetches state of simulated (unconfirmed) tx", async () => {
        const nonce = (await getNonce(smartAccount, nonceTrack)) + 10n // future nonce so that is submits, but doesn't finalize
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
        const tx = await signTx(unsigned)
        unsigned.validatorData = tx.validatorData
        const happyTxHash = computeHappyTxHash(unsigned)
        // submit transaction, but don't wait for it to complete
        client.api.v1.submitter.submit.$post({ json: { tx: serializeBigInt(tx) } }).then((a) => a.json())

        await new Promise((resolve) => setTimeout(resolve, 1000))

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
