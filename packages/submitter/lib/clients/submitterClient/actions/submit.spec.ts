import { beforeAll, describe, expect, it } from "bun:test"
import { encodeFunctionData } from "viem"
import { deployment } from "#lib/deployments"
import { HappyBaseError } from "#lib/errors"
import { create } from "#lib/handlers/accounts/create"
import { createMockTokenAMintHappyTx, getNonce, testAccount } from "#lib/tests/utils"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { submit } from "./submit"

describe("submit", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        ;({ address: smartAccount } = await create({
            owner: testAccount.account.address,
            salt: "0x000000000000000000000000000000000000000000000000000000000000001",
        }))
    })

    describe("success", () => {
        it("should simulate submit with 0n gas", async () => {
            const nonceTrack = 1n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.executeGasLimit = 0n
            unsigned.gasLimit = 0n
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const hash = await submit({
                account: findExecutionAccount(unsigned),
                address: deployment.HappyEntryPoint,
                args: [encodeHappyTx(unsigned)],
            })

            expect(hash).toStartWith("0x")
            expect(hash.length).toBe(66)
            expect(BigInt(hash)).toBeGreaterThan(0n)
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

            const hash = await submit({
                account: findExecutionAccount(unsigned),
                address: deployment.HappyEntryPoint,
                args: [encodeHappyTx(unsigned)],
            })

            expect(hash).toStartWith("0x")
            expect(hash.length).toBe(66)
            expect(BigInt(hash)).toBeGreaterThan(0n)
        })
    })

    describe("failure", () => {
        it("should fail with future nonce", async () => {
            const nonceTrack = 1000_000_000_000n + BigInt(Math.floor(Math.random() * 10_000_000))
            const nonceValue = 1000_000_000_000n + BigInt(Math.floor(Math.random() * 10_000_000))
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            try {
                await submit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                const data = err.getResponseData()
                expect(err).toBeInstanceOf(HappyBaseError)
                expect(data.status).toBe(EntryPointStatus.ValidationFailed)
                expect(data.failureReason).toBeUndefined()
                expect(data.revertData).toBe("InvalidNonce")
            }
        })

        it("should fail with unfunded self-paying (self paying)", async () => {
            const nonceTrack = 3n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.paymaster = smartAccount
            unsigned.executeGasLimit = 0n
            unsigned.gasLimit = 0n
            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            try {
                await submit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                const data = err.getResponseData?.()

                expect(err).toBeInstanceOf(HappyBaseError)
                expect(data.status).toBe(EntryPointStatus.PaymentFailed)
                expect(data.failureReason).toBeUndefined()
                expect(data.revertData).toBeUndefined()
            }
        })

        it("should fail on invalid signature", async () => {
            const nonceTrack = 4n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)

            // invalid signature
            unsigned.validatorData = "0x"

            try {
                await submit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })
                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                const data = err.getResponseData?.()
                expect(err).toBeInstanceOf(HappyBaseError)
                expect(data.status).toBe(EntryPointStatus.ValidationReverted)
                expect(data.failureReason).toBeUndefined()
                expect(data.revertData).toBe("InvalidSignature")
            }
        })

        it("a revert when invalid ABI is used to make call", async () => {
            const nonceTrack = 5n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.callData = encodeFunctionData({
                abi: [{ type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" }],
                functionName: "badFunc",
                args: [],
            })

            unsigned.validatorData = await testAccount.account.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })
            try {
                await submit({
                    account: findExecutionAccount(unsigned),
                    address: deployment.HappyEntryPoint,
                    args: [encodeHappyTx(unsigned)],
                })

                expect.unreachable()
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            } catch (err: any) {
                const data = err.getResponseData?.()
                expect(err).toBeInstanceOf(HappyBaseError)
                expect(data.status).toBe(EntryPointStatus.ExecuteReverted)
                expect(data.failureReason).toBeUndefined()
                expect(data.revertData).toBeUndefined()
            }
        })
    })
})
