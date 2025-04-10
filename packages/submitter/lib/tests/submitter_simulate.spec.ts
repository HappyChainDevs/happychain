import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { encodeFunctionData } from "viem/utils"
import env from "#lib/env"
import { app } from "#lib/server"
import { createMockTokenAMintHappyTx, getNonce, signTx } from "#lib/tests/utils"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus } from "#lib/tmp/interface/status"
import { serializeBigInt } from "#lib/utils/serializeBigInt"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: HappyTx) => signTx(testAccount, tx)

describe("submitter_simulate", () => {
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

    describe("success", () => {
        // try with no gas, and lots of gas
        it("should simulate submit with 0n gas", async () => {
            unsignedTx.executeGasLimit = 0n
            unsignedTx.gasLimit = 0n
            const signedTx = await sign(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await results.json()) as any
            expect(results.status).toBe(200)
            expect(response.status).toBe(EntryPointStatus.Success)
            expect(response.simulationResult).toStrictEqual({
                status: EntryPointStatus.Success,
                entryPoint: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
                validationStatus: SimulatedValidationStatus.Success,
            })
            expect(BigInt(response.maxFeePerGas)).toBeGreaterThan(1000000000n)
            expect(BigInt(response.submitterFee)).toBeGreaterThan(0n)
            expect(BigInt(response.validateGasLimit)).toBeGreaterThan(10000n)
            // expect(BigInt(response.validatePaymentGasLimit)).toBeGreaterThan(0n)
            expect(BigInt(response.executeGasLimit)).toBeGreaterThan(10000n)
            expect(BigInt(response.gasLimit)).toBeGreaterThan(10000n)
        })

        it("should simulate submit with 4000000000n gas", async () => {
            unsignedTx.executeGasLimit = 4000000000n
            unsignedTx.gasLimit = 4000000000n
            const signedTx = await sign(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await results.json()) as any

            expect(results.status).toBe(200)
            expect(response.status).toBe(EntryPointStatus.Success)
            expect(response.simulationResult).toStrictEqual({
                status: EntryPointStatus.Success,
                entryPoint: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
                validationStatus: SimulatedValidationStatus.Success,
            })
            expect(BigInt(response.maxFeePerGas)).toBeGreaterThan(1000000000n)
            expect(BigInt(response.submitterFee)).toBeGreaterThan(0n)
            expect(BigInt(response.validateGasLimit)).toBeGreaterThan(10000n)
            // expect(BigInt(response.validatePaymentGasLimit)).toBeGreaterThan(0n)
            expect(BigInt(response.executeGasLimit)).toBeGreaterThan(10000n)
            expect(BigInt(response.gasLimit)).toBeGreaterThan(10000n)
        })

        it("should succeed with future nonce", async () => {
            unsignedTx.nonceValue += 1_000_000n
            const signedTx = await sign(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await results.json()) as any

            expect(results.status).toBe(200)
            expect(response.status).toBe(EntryPointStatus.Success)
            expect(response.simulationResult).toStrictEqual({
                status: EntryPointStatus.Success,
                entryPoint: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
                validationStatus: SimulatedValidationStatus.FutureNonce,
            })
            expect(BigInt(response.maxFeePerGas)).toBeGreaterThan(1000000000n)
            expect(BigInt(response.submitterFee)).toBeGreaterThan(0n)
            expect(BigInt(response.validateGasLimit)).toBeGreaterThan(10000n)
            // expect(BigInt(response.validatePaymentGasLimit)).toBeGreaterThan(0n)
            expect(BigInt(response.executeGasLimit)).toBeGreaterThan(10000n)
            expect(BigInt(response.gasLimit)).toBeGreaterThan(10000n)
        })
    })

    describe("failure", () => {
        it("can't use a too-low nonce", async () => {
            await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(signedTx) } })

            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })

            const response = (await results.json()) as any

            // TODO: this should be a more descriptive error
            expect(results.status).toBe(200)
            expect(response.status).toBe(EntryPointStatus.UnexpectedReverted)
        })

        // Contract Bug
        it.skip("should simulate revert on unfunded self-sponsored", async () => {
            unsignedTx.paymaster = smartAccount
            unsignedTx.executeGasLimit = 0n
            unsignedTx.gasLimit = 0n
            signedTx = await sign(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await results.json()) as any

            const sim = response.simulationResult as SimulationResult // TODO: error in contract?
            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Failed)
            expect(sim.status).toBe(EntryPointStatus.PaymentFailed)
            expect(sim.revertData).toBe("0x3b1ab104")
        })

        it("should revert on invalid signature", async () => {
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(unsignedTx) } })
            const response = (await results.json()) as any
            const sim = response.simulationResult as SimulationResult
            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x8baa579f")
            expect(sim.status).toBe(EntryPointStatus.ValidationReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
        })

        it("should revert on incorrect account", async () => {
            const wrongAccount = await createMockTokenAMintHappyTx(`0x${(BigInt(smartAccount) + 1n).toString(16)}`, 0n)
            signedTx = await sign(wrongAccount)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await results.json()) as any
            const sim = response.simulationResult as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x") // InvalidSignature
            expect(sim.status).toBe(EntryPointStatus.ValidationReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
        })

        it("should revert on invalid destination account", async () => {
            unsignedTx.dest = smartAccount
            signedTx = await sign(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await results.json()) as any
            const sim = response.simulationResult as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x")
            expect(sim.status).toBe(EntryPointStatus.CallReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Success)
        })

        it("simulates a revert when invalid ABI is used to make call", async () => {
            unsignedTx.callData = encodeFunctionData({
                abi: [{ type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" }],
                functionName: "badFunc",
                args: [],
            })
            signedTx = await sign(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await results.json()) as any
            const sim = response.simulationResult as SimulationResult
            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x")
            expect(sim.status).toBe(EntryPointStatus.CallReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Success)
        })
    })
})
