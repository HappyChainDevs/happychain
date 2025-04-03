import { beforeAll, describe, expect, it } from "bun:test"
import type { Result } from "neverthrow"
import { encodeFunctionData } from "viem"
import env from "#lib/env"
import { getErrorNameFromSelector } from "#lib/errors/parsedCodes"
import { create } from "#lib/handlers/accounts/create"
import { createMockTokenAMintHappyTx, getNonce, testAccount } from "#lib/tests/utils"
import type { SimulationResult } from "#lib/tmp/interface/SimulationResult"
import { EntryPointStatus, SimulatedValidationStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { simulateSubmit } from "./simulate"
import { submit } from "./submit"

describe("simulateSubmit", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        ;({ address: smartAccount } = await create({
            owner: testAccount.account.address,
            salt: "0x000000000000000000000000000000000000000000000000000000000000001",
        }).then((a) => (a.isOk() ? a.value : ({} as never))))
    })

    describe("utilities", () => {
        it("should decode error selectors predictably", () => {
            expect(getErrorNameFromSelector("0x8baa579f")).toBe("InvalidSignature")
            expect(getErrorNameFromSelector("0x2c5ca398")).toBe("UnknownDuringSimulation")
        })
    })

    describe("success", () => {
        // try with no gas, and lots of gas
        it("should simulate submit with 0n gas", async () => {
            const nonceTrack = 1n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.executeGasLimit = 0n
            unsigned.gasLimit = 0n
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const simResult = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })
            expect(simResult.isOk()).toBe(true)

            const { result, simulation } = simResult.isOk()
                ? simResult.value
                : ({} as typeof simResult extends Result<infer U, never> ? U : never)

            expect(result.gas).toBeGreaterThan(80000)
            expect(result.gas).toBeLessThan(150000)
            expect(result.executeGas).toBeGreaterThan(15000)
            expect(result.executeGas).toBeLessThan(50000)
            expect(result.validationStatus).toBe("0x00000000")
            expect(result.callStatus).toBe(0)
            expect(result.revertData).toBe("0x")

            expect(simulation?.status).toBe(EntryPointStatus.Success)
            expect(simulation?.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(simulation?.validationStatus).toBe(SimulatedValidationStatus.Success)
        })

        it("should simulate submit with 4000000000n gas", async () => {
            const nonceTrack = 2n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.executeGasLimit = 4000000000n
            unsigned.gasLimit = 4000000000n
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const simResult = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })

            const { result, simulation } = simResult.isOk()
                ? simResult.value
                : ({} as typeof simResult extends Result<infer U, never> ? U : never)

            expect(result.gas).toBeGreaterThan(80000)
            expect(result.gas).toBeLessThan(150000)
            expect(result.executeGas).toBeGreaterThan(15000)
            expect(result.executeGas).toBeLessThan(50000)
            expect(result.validationStatus).toBe("0x00000000")
            expect(result.callStatus).toBe(0)
            expect(result.revertData).toBe("0x")

            expect(simulation?.status).toBe(EntryPointStatus.Success)
            expect(simulation?.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(simulation?.validationStatus).toBe(SimulatedValidationStatus.Success)
        })

        it("should succeed with future nonce", async () => {
            const unsigned = await createMockTokenAMintHappyTx(
                smartAccount,
                1000_000_000_000n + BigInt(Math.floor(Math.random() * 10000000)),
            )
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const simResult = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })

            const { result, simulation } = simResult.isOk()
                ? simResult.value
                : ({} as typeof simResult extends Result<infer U, never> ? U : never)

            expect(result.validationStatus).toBe("0xbc6fae2d")
            expect(result.callStatus).toBe(0)
            expect(result.revertData).toBe("0x")

            expect(simulation?.status).toBe(EntryPointStatus.Success)
            expect(simulation?.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(simulation?.validationStatus).toBe(SimulatedValidationStatus.FutureNonce)
            expect(simulation?.revertData).toBeUndefined()
        })
    })

    describe("failure", () => {
        // TODO: submit hasin't yet implemented nothrow so this fails
        it("can't use a too-low nonce", async () => {
            const nonceTrack = 1000n
            let nonceValue = await getNonce(smartAccount, nonceTrack)
            if (!nonceValue) {
                const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
                unsigned.validatorData = await testAccount.account.signMessage({
                    message: { raw: computeHappyTxHash(unsigned) },
                })

                await submit({ entryPoint: env.DEPLOYMENT_ENTRYPOINT, tx: unsigned })

                nonceValue++
            }

            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue - 1n, nonceTrack)
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })

            // @ts-expect-error
            const sim = resp.error.simulation as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
            expect(sim.status).toBe(EntryPointStatus.UnexpectedReverted)
            expect(sim.revertData).toBe("0x756688fe") // InvalidNonce
        })

        it("should simulate revert on unfunded self-sponsored", async () => {
            const nonceTrack = 1n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.paymaster = smartAccount
            unsigned.executeGasLimit = 0n
            unsigned.gasLimit = 0n
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })
            // @ts-expect-error
            const sim = resp.error.simulation as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
            expect(sim.status).toBe(EntryPointStatus.PaymentFailed)
            expect(sim.revertData).toBe("0x00000000")
        })

        it("should revert on invalid signature", async () => {
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)

            // invalid signature
            unsigned.validatorData = "0x"

            const resp = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })

            // @ts-expect-error
            const sim = resp.error.simulation as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x8baa579f")
            expect(sim.status).toBe(EntryPointStatus.ValidationReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
        })

        it("should revert on incorrect account", async () => {
            const unsigned = await createMockTokenAMintHappyTx(`0x${(BigInt(smartAccount) + 1n).toString(16)}`, 0n)

            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })

            // @ts-expect-error
            const sim = resp.error.simulation as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x") // InvalidSignature
            expect(sim.status).toBe(EntryPointStatus.UnexpectedReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Reverted)
        })

        it("should revert on invalid destination account", async () => {
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)
            unsigned.dest = smartAccount

            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })

            // @ts-expect-error
            const sim = resp.error.simulation as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x")
            expect(sim.status).toBe(EntryPointStatus.CallReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Success)
        })

        it("simulates a revert when invalid ABI is used to make call", async () => {
            const nonceTrack = BigInt(Math.floor(Math.random() * 1000))
            const nonce = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)
            unsigned.callData = encodeFunctionData({
                abi: [{ type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" }],
                functionName: "badFunc",
                args: [],
            })
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: env.DEPLOYMENT_ENTRYPOINT,
                args: [encodeHappyTx(unsigned)],
            })

            // @ts-expect-error
            const sim = resp.error.simulation as SimulationResult

            expect(sim.entryPoint).toBe(env.DEPLOYMENT_ENTRYPOINT)
            expect(sim.revertData).toBe("0x")
            expect(sim.status).toBe(EntryPointStatus.CallReverted)
            expect(sim.validationStatus).toBe(SimulatedValidationStatus.Success)
        })
    })
})
