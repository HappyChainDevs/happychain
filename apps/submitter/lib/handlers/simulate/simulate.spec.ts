import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import type { ClientResponse } from "hono/client"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { SimulateError, SimulateOutput, SimulateSuccess } from "#lib/handlers/simulate"
import type { Boop } from "#lib/types"
import { CallStatus, Onchain } from "#lib/types"
import { apiClient, createMintBoop, createSmartAccount, getNonce, signBoop } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signBoop(testAccount, tx)

describe("submitter_simulate", () => {
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

    type ChecksOptions = {
        future?: boolean
        invalidSignature?: boolean
    }

    const partialSimpleSuccessfulOutput = (opts: ChecksOptions) => ({
        status: Onchain.Success,
        validityUnknownDuringSimulation: opts.invalidSignature ?? false,
        futureNonceDuringSimulation: opts.future ?? false,
        callStatus: CallStatus.SUCCEEDED,
    })

    async function checks(results: ClientResponse<SimulateOutput>, opts: ChecksOptions = {}) {
        const response = (await results.json()) as SimulateSuccess
        expect(results.status).toBe(200)
        expect(response.status).toBe(Onchain.Success)
        expect(response).toMatchObject(partialSimpleSuccessfulOutput(opts))
        expect(BigInt(response.maxFeePerGas)).toBeGreaterThan(1000n)
        expect(BigInt(response.submitterFee)).toBeGreaterThanOrEqual(0n)
        expect(response.gas).toBeGreaterThan(10000)
        expect(response.validateGas).toBeGreaterThan(10000)
        expect(response.executeGas).toBeGreaterThan(10000n)
        return response
    }

    describe("success", () => {
        it("should simulate submit with 0n gas", async () => {
            unsignedTx.gasLimit = 0
            unsignedTx.validateGasLimit = 0
            unsignedTx.validatePaymentGasLimit = 0
            unsignedTx.executeGasLimit = 0
            const signedTx = await sign(unsignedTx)
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await apiClient.api.v1.boop.simulate.$post(json)) as ClientResponse<SimulateOutput>
            const response = await checks(results)
            expect(response.gas).toBeGreaterThan(unsignedTx.gasLimit)
            expect(response.validateGas).toBeGreaterThan(unsignedTx.validateGasLimit)
            expect(response.executeGas).toBeGreaterThan(unsignedTx.executeGasLimit)
        })

        it("should simulate submit with 4_000_000n gas", async () => {
            unsignedTx.validateGasLimit = 1_000_000
            unsignedTx.executeGasLimit = 1_000_000
            unsignedTx.gasLimit = 4_000_000
            const signedTx = await sign(unsignedTx)
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await apiClient.api.v1.boop.simulate.$post(json)) as ClientResponse<SimulateOutput>
            const response = await checks(results)
            expect(response.gas).toBe(unsignedTx.gasLimit)
            expect(response.validateGas).toBe(unsignedTx.validateGasLimit)
            expect(response.executeGas).toBe(unsignedTx.executeGasLimit)
        })

        it("should succeed with future nonce, but indicate it", async () => {
            const signedTx = await sign({
                ...unsignedTx,
                nonceValue: 1_000_000n + unsignedTx.nonceValue,
            })
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await apiClient.api.v1.boop.simulate.$post(json)) as ClientResponse<SimulateOutput>
            await checks(results, { future: true })
        })

        it("should succeed on invalid signature, but indicate it", async () => {
            // use empty signature from the unsigned tx
            const json = { json: { boop: serializeBigInt(unsignedTx) } }
            const results = (await apiClient.api.v1.boop.simulate.$post(json)) as ClientResponse<SimulateOutput>
            await checks(results, { invalidSignature: true })
        })
    })

    describe("failure", () => {
        it("can't use a too-low nonce", async () => {
            // execute so that this nonce has been used
            await apiClient.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await apiClient.api.v1.boop.simulate.$post(json)) as ClientResponse<SimulateError>
            const response = (await results.json()) as any
            expect(results.status).toBe(400)
            expect(response.status).toBe(Onchain.InvalidNonce)
        })

        it("should simulate revert on unfunded self-sponsored", async () => {
            unsignedTx = {
                ...unsignedTx,
                payer: account, // self-sponsored
                executeGasLimit: 0,
                gasLimit: 0,
            }

            signedTx = await sign(unsignedTx)
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await apiClient.api.v1.boop.simulate.$post(json)) as ClientResponse<SimulateError>
            const response = (await results.json()) as SimulateError
            expect(results.status).toBe(402)
            expect(response.status).toBe(Onchain.PayoutFailed)
        })

        it("should revert on invalid call", async () => {
            // we're targeting a mint transaction at our own account, which doesn't support that ABI
            unsignedTx = { ...unsignedTx, dest: account }
            signedTx = await sign(unsignedTx)
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await apiClient.api.v1.boop.simulate.$post(json)) as ClientResponse<SimulateError>
            const response = (await results.json()) as SimulateError
            expect(results.status).toBe(422)
            expect(response.status).toBe(Onchain.CallReverted)
            expect(response.revertData).toBe("0x")
        })
    })
})
