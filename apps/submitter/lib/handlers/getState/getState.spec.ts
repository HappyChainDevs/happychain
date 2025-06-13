// Proxy HAS TO BE IMPORTED FIRST so that it starts before submitter starts!
import "#lib/utils/test/proxyServer"

import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, sleep } from "@happy.tech/common"
import { serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { ExecuteSuccess } from "#lib/handlers/execute"
import type { Boop } from "#lib/types"
import { Onchain } from "#lib/types"
import { computeBoopHash } from "#lib/utils/boop"
import { apiClient, createMintBoop, createSmartAccount, getNonce, signBoop } from "#lib/utils/test"
import { GetState, type GetStateError, type GetStateReceipt, type GetStateSimulated } from "./types"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signBoop(testAccount, tx)

describe("submitter_state", () => {
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
        unsignedTx = createMintBoop({ account, nonceValue, nonceTrack })
        signedTx = await sign(unsignedTx)
    })

    it("fetches state of recent tx", async () => {
        // submit all transactions, but only wait for the first to complete
        const response = (await apiClient.api.v1.boop.execute
            .$post({ json: { boop: serializeBigInt(signedTx) } })
            .then((a) => a.json())) as ExecuteSuccess
        expect(response.status).toBe(Onchain.Success)
        expect(response.receipt).toBeDefined()
        const state = (await apiClient.api.v1.boop.state[":boopHash"]
            .$get({ param: { boopHash: response.receipt.boopHash } })
            .then((a) => a.json())) as GetStateReceipt
        expect(state.status).toBe(GetState.Receipt)
        expect(state.receipt.boopHash).toBe(response.receipt.boopHash)
        expect((state as any).simulation).toBeUndefined()
    })

    it("fetches state of an unknown tx", async () => {
        const state = (await apiClient.api.v1.boop.state[":boopHash"]
            .$get({ param: { boopHash: account } })
            .then((a) => a.json())) as GetStateError
        expect(state.status).toBe(GetState.UnknownBoop)
    })

    it("fetches state of simulated (unconfirmed) future tx", async () => {
        // future nonce so that is submits, but doesn't finalize
        const futureUnsignedTx = createMintBoop({ account, nonceValue: nonceValue + 1n, nonceTrack })
        const futureSignedTx = await sign(futureUnsignedTx)
        const boopHash = computeBoopHash(env.CHAIN_ID, futureSignedTx)

        // submit transaction, but don't wait for it to complete
        const blockedTx = apiClient.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(futureSignedTx) } })

        await sleep(100)

        const state = (await apiClient.api.v1.boop.state[":boopHash"]
            .$get({ param: { boopHash } })
            .then((a) => a.json())) as GetStateSimulated

        expect(state.status).toBe(GetState.Simulated)
        expect(state.simulation).toBeDefined()
        expect((state as any).receipt).toBeUndefined()

        await apiClient.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
        await blockedTx // wait for the transaction to complete so CI isn't grumpy
    })
})
