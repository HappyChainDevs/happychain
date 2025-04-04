import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import env from "#lib/env"
import { app } from "#lib/server"
import { createMockTokenAMintHappyTx, getNonce, signTx, testAccount } from "#lib/tests/utils"
import type { HappyTx } from "#lib/tmp/interface/HappyTx"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus, SubmitterErrorStatus } from "#lib/tmp/interface/status"
import { serializeBigInt } from "#lib/utils/serializeBigInt"

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
        signedTx = await signTx(unsignedTx)
    })

    describe("success", () => {
        // try with no gas, and lots of gas
        it("should simulate submit with 0n gas", async () => {
            unsignedTx.executeGasLimit = 0n
            unsignedTx.gasLimit = 0n
            const signedTx = await signTx(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })

            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
            expect(BigInt(response.validatePaymentGasLimit)).toBeGreaterThan(0n)
            expect(BigInt(response.executeGasLimit)).toBeGreaterThan(10000n)
            expect(BigInt(response.gasLimit)).toBeGreaterThan(10000n)
        })

        it("should simulate submit with 4000000000n gas", async () => {
            unsignedTx.executeGasLimit = 4000000000n
            unsignedTx.gasLimit = 4000000000n
            const signedTx = await signTx(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })

            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
            expect(BigInt(response.validatePaymentGasLimit)).toBeGreaterThan(0n)
            expect(BigInt(response.executeGasLimit)).toBeGreaterThan(10000n)
            expect(BigInt(response.gasLimit)).toBeGreaterThan(10000n)
        })

        it("should succeed with future nonce", async () => {
            unsignedTx.nonceValue += 1_000_000n
            const signedTx = await signTx(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })

            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const response = (await results.json()) as any

            // TODO: this should be a more descriptive error
            expect(results.status).toBe(200)
            expect(response.status).toBe(SubmitterErrorStatus.UnexpectedError)
        })

        it("should simulate revert on unfunded self-sponsored", async () => {
            unsignedTx.paymaster = smartAccount
            unsignedTx.executeGasLimit = 0n
            unsignedTx.gasLimit = 0n
            signedTx = await signTx(unsignedTx)
            const results = await client.api.v1.submitter.simulate.$post({ json: { tx: serializeBigInt(signedTx) } })

            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const response = (await results.json()) as any

            const sim = response.simulationResult as SimulationResult // TODO: error in contract?
            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Failed)
            expect(sim.status).toBe(EntryPointStatus.PaymentFailed)
            expect(sim.revertData).toBe("0x3b1ab104")
        })

        // it.only("should revert on invalid signature", async () => {
        //     const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)

        //     // invalid signature
        //     unsigned.validatorData = "0x"

        //     const resp = await simulateBoop(env.DEPLOYMENT_ENTRYPOINT, encodeHappyTx(unsigned))

        //     // @ts-expect-error
        //     const sim = resp.error.simulation as SimulationResult

        //     expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
        //     expect(sim.revertData).toBe("0x8baa579f")
        //     expect(sim.status).toBe(EntryPointStatus.ValidationReverted)
        //     expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
        // })

        // it("should revert on incorrect account", async () => {
        //     const unsigned = await createMockTokenAMintHappyTx(`0x${(BigInt(smartAccount) + 1n).toString(16)}`, 0n)

        //     unsigned.validatorData = await testAccount.signMessage({
        //         message: { raw: computeHappyTxHash(unsigned) },
        //     })

        //     const resp = await simulateBoop(env.DEPLOYMENT_ENTRYPOINT, encodeHappyTx(unsigned))

        //     // @ts-expect-error
        //     const sim = resp.error.simulation as SimulationResult

        //     expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
        //     expect(sim.revertData).toBe("0x") // InvalidSignature
        //     expect(sim.status).toBe(EntryPointStatus.ValidationReverted)
        //     expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
        // })

        // it("should revert on invalid destination account", async () => {
        //     const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)
        //     unsigned.dest = smartAccount

        //     unsigned.validatorData = await testAccount.signMessage({
        //         message: { raw: computeHappyTxHash(unsigned) },
        //     })

        //     const resp = await simulateBoop(env.DEPLOYMENT_ENTRYPOINT, encodeHappyTx(unsigned))

        //     // @ts-expect-error
        //     const sim = resp.error.simulation as SimulationResult

        //     expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
        //     expect(sim.revertData).toBe("0x")
        //     expect(sim.status).toBe(EntryPointStatus.CallReverted)
        //     expect(sim.validationStatus).toBe(SimulatedValidationStatus.Success)
        // })

        // it("simulates a revert when invalid ABI is used to make call", async () => {
        //     const nonceTrack = BigInt(Math.floor(Math.random() * 1000))
        //     const nonce = await getNonce(smartAccount, nonceTrack)
        //     const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
        //     unsigned.callData = encodeFunctionData({
        //         abi: [{ type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" }],
        //         functionName: "badFunc",
        //         args: [],
        //     })
        //     unsigned.validatorData = await testAccount.signMessage({
        //         message: { raw: computeHappyTxHash(unsigned) },
        //     })

        //     const resp = await simulateBoop(env.DEPLOYMENT_ENTRYPOINT, encodeHappyTx(unsigned))

        //     // @ts-expect-error
        //     const sim = resp.error.simulation as SimulationResult
        //     expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
        //     expect(sim.revertData).toBe("0x")
        //     expect(sim.status).toBe(EntryPointStatus.CallReverted)
        //     expect(sim.validationStatus).toBe(SimulatedValidationStatus.Success)
        // })
    })
})
