import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import type { Address } from "@happy.tech/common"
import { serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { Boop } from "#lib/types"
import { computeBoopHash } from "#lib/utils/boop/computeBoopHash"
import { client, createMockTokenAMintBoop, createSmartAccount, getNonce, signTx } from "#lib/utils/test"
import { WaitForReceipt, type WaitForReceiptError, type WaitForReceiptSuccess } from "./types"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_receipt", () => {
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

    it("fetches state of recently completed tx with 0 timeout", async () => {
        const boopHash = computeBoopHash(env.CHAIN_ID, signedTx)

        // submit transaction and wait to complete
        await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })

        const state = (await client.api.v1.boop.receipt[":boopHash"]
            .$get({ param: { boopHash }, query: { timeout: "0" } })
            .then((a) => a.json())) as WaitForReceiptSuccess

        expect(state.status).toBe(WaitForReceipt.Success)
        expect(state.receipt.boopHash).toBe(boopHash)
        expect((state as any).simulation).toBeUndefined()
    })

    it("fetches both simulated and resolved states depending on timeout", async () => {
        const boopHash = computeBoopHash(env.CHAIN_ID, signedTx)

        // Submit transaction but don't for inclusion.
        await client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })

        const [stateSimulated, stateResolved] = await Promise.all([
            client.api.v1.boop.receipt[":boopHash"]
                .$get({ param: { boopHash }, query: { timeout: "100" } }) // return near immediately
                .then((a) => a.json() as any as WaitForReceiptError),
            client.api.v1.boop.receipt[":boopHash"]
                .$get({ param: { boopHash }, query: { timeout: "2100" } }) // wait 2 seconds to get next block
                .then((a) => a.json() as any as WaitForReceiptSuccess),
        ])

        expect(stateResolved.status).toBe(WaitForReceipt.Success)
        expect(stateResolved.receipt.boopHash).toBe(boopHash)
        expect((stateResolved as any).simulation).toBeUndefined()

        if (env.AUTOMINE_TESTS) return // instantly included with auto-mining, so the following will fail

        expect(stateSimulated.status).toBe(WaitForReceipt.ReceiptTimeout)
        expect((stateSimulated as any).receipt).toBeUndefined()
    })
    it("should reject immediately if the boop isn't known", async () => {
        const boopHash = computeBoopHash(env.CHAIN_ID, unsignedTx)
        const result = await client.api.v1.boop.receipt[":boopHash"].$get({
            param: { boopHash },
            query: { timeout: "2000" },
        })
        const output = (await result.json()) as WaitForReceiptError
        expect(result.status).toBe(404)
        expect(output.status).toBe(WaitForReceipt.UnknownBoop)
    })
})
