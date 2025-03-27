import { beforeAll, describe, expect, it } from "bun:test"
import { encodeFunctionData } from "viem"
import { deployment } from "#lib/deployments"
import { SimulationError } from "#lib/errors/contract-errors"
import { getErrorNameFromSelector } from "#lib/errors/parsedCodes"
import { create } from "#lib/handlers/accounts/create"
import { createMockTokenAMintHappyTx, getNonce, testAccount } from "#lib/tests/utils"
import { EntryPointStatus, SimulatedValidationStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash.ts"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { simulateSubmit } from "./simulateSubmit"
import { submit } from "./submit"

describe("simulateSubmit", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        ;({ address: smartAccount } = await create({
            owner: testAccount.account.address,
            salt: "0x000000000000000000000000000000000000000000000000000000000000001",
        }))
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

            const { result, simulation } = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: deployment.HappyEntryPoint,
                args: [encodeHappyTx(unsigned)],
            })

            expect(result.gas).toBeGreaterThan(80000)
            expect(result.gas).toBeLessThan(150000)
            expect(result.executeGas).toBeGreaterThan(15000)
            expect(result.executeGas).toBeLessThan(50000)
            expect(result.validationStatus).toBe("0x00000000")
            expect(result.callStatus).toBe(0)
            expect(result.revertData).toBe("0x")

            expect(simulation?.status).toBe(EntryPointStatus.Success)
            expect(simulation?.entryPoint).toBe(deployment.HappyEntryPoint)
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

            const { result, simulation } = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: deployment.HappyEntryPoint,
                args: [encodeHappyTx(unsigned)],
            })

            expect(result.gas).toBeGreaterThan(80000)
            expect(result.gas).toBeLessThan(150000)
            expect(result.executeGas).toBeGreaterThan(15000)
            expect(result.executeGas).toBeLessThan(50000)
            expect(result.validationStatus).toBe("0x00000000")
            expect(result.callStatus).toBe(0)
            expect(result.revertData).toBe("0x")

            expect(simulation?.status).toBe(EntryPointStatus.Success)
            expect(simulation?.entryPoint).toBe(deployment.HappyEntryPoint)
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

            const { result, simulation } = await simulateSubmit({
                account: findExecutionAccount(unsigned),
                address: deployment.HappyEntryPoint,
                args: [encodeHappyTx(unsigned)],
            })

            expect(result.validationStatus).toBe("0xbc6fae2d")
            expect(result.callStatus).toBe(0)
            expect(result.revertData).toBe("0x")

            expect(simulation?.status).toBe(EntryPointStatus.Success)
            expect(simulation?.entryPoint).toBe(deployment.HappyEntryPoint)
            expect(simulation?.validationStatus).toBe(SimulatedValidationStatus.FutureNonce)
        })
    })

    describe("failure", () => {
        it("can't use a too-low nonce", async () => {
            const nonceTrack = 1000n
            let nonceValue = await getNonce(smartAccount, nonceTrack)

            if (!nonceValue) {
                const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
                unsigned.validatorData = await testAccount.account.signMessage({
                    message: { raw: computeHappyTxHash(unsigned) },
                })
                await submit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                nonceValue++
            }

            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue - 1n, nonceTrack)
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            try {
                await simulateSubmit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                expect(err).toBeInstanceOf(SimulationError)
                expect(err.errorName).toBe("InvalidNonce")
                expect(err.entryPoint).toBe(deployment.HappyEntryPoint)
                expect(err.validationStatus).toBe(SimulatedValidationStatus.Reverted)
                expect(err.status).toBe(EntryPointStatus.UnexpectedReverted)
            }
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

            try {
                await simulateSubmit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                expect(err).toBeInstanceOf(SimulationError)
                expect(err.errorName).toBe("Failure")
                expect(err.entryPoint).toBe(deployment.HappyEntryPoint)
                expect(err.validationStatus).toBe(SimulatedValidationStatus.Reverted)
                expect(err.status).toBe(EntryPointStatus.PaymentFailed)
            }
        })

        it("should revert on invalid signature", async () => {
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)

            // invalid signature
            unsigned.validatorData = "0x"

            try {
                await simulateSubmit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                expect(err).toBeInstanceOf(SimulationError)
                expect(err.errorName).toBe("InvalidSignature")
                expect(err.entryPoint).toBe(deployment.HappyEntryPoint)
                expect(err.validationStatus).toBe(SimulatedValidationStatus.Reverted)
                expect(err.status).toBe(EntryPointStatus.ValidationReverted)
            }
        })

        it("should revert on incorrect account", async () => {
            const unsigned = await createMockTokenAMintHappyTx(`0x${(BigInt(smartAccount) + 1n).toString(16)}`, 0n)

            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            try {
                await simulateSubmit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                expect(err).toBeInstanceOf(SimulationError)
                expect(err.errorName).toBe("Revert")
                expect(err.entryPoint).toBe(deployment.HappyEntryPoint)
                expect(err.validationStatus).toBe(SimulatedValidationStatus.Reverted)
                expect(err.status).toBe(EntryPointStatus.UnexpectedReverted)
            }
        })

        it("should revert on invalid destination account", async () => {
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)
            unsigned.dest = smartAccount

            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            try {
                await simulateSubmit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                expect(err).toBeInstanceOf(SimulationError)
                expect(err.errorName).toBe("Revert")
                expect(err.entryPoint).toBe(deployment.HappyEntryPoint)
                expect(err.validationStatus).toBe(SimulatedValidationStatus.Success)
                expect(err.status).toBe(EntryPointStatus.ExecuteReverted)
            }
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
            try {
                await simulateSubmit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })

                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                expect(err).toBeInstanceOf(SimulationError)
                expect(err.errorName).toBe("Revert")
                expect(err.entryPoint).toBe(deployment.HappyEntryPoint)
                expect(err.status).toBe(EntryPointStatus.ExecuteReverted)
                expect(err.validationStatus).toBe(SimulatedValidationStatus.Success) // it does simulate success, but it's a revert
            }
        })
    })
})
