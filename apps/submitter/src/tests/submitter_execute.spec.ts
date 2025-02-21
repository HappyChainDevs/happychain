import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { keccak256 } from "viem"
import type { BaseFailedError } from "#src/errors"
import { app } from "#src/server"
import type { HappyTxStateSuccess } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"
import {
    createMockTokenAMintHappyTx,
    fundAccount,
    getMockTokenABalance,
    getNonce,
    prepareTx,
    testAccount,
    testPublicClient,
} from "./utils"

const client = testClient(app)

describe("submitter_execute", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        // deploys smart account (if needed)
        ;({ address: smartAccount } = await client.api.v1.accounts.create
            .$post({
                json: {
                    owner: testAccount.account.address,
                    // salt: increment counter to create new smartAccount
                    salt: keccak256(Uint8Array.from(Buffer.from([testAccount.account.address, 1].join("_")))),
                },
            })
            .then((a) => a.json()))
    })

    describe("self-paying", () => {
        beforeAll(async () => {
            // faucet for self paying
            if ((await testPublicClient.getBalance({ address: smartAccount })) < 10n ** 16n) {
                await fundAccount(smartAccount)
            }
        })

        it("mints tokens", async () => {
            const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))
            // be your own paymaster!
            dummyHappyTx.paymaster = smartAccount
            const prepared = await prepareTx(dummyHappyTx)
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })
            expect(result.status).toBe(200)
            if (result.status !== 200) return
            const response = (await result.json()) as unknown as HappyTxStateSuccess
            expect(response.status).toBe(EntryPointStatus.Success)
            expect(response.included).toBe(true)
            expect(response.receipt.txReceipt.transactionHash).toBeString()
        })
    })

    describe("paymaster", () => {
        describe("proper response structure (mint tokens)", () => {
            let result: Awaited<ReturnType<typeof client.api.v1.submitter.execute.$post>>
            let response: HappyTxStateSuccess
            beforeAll(async () => {
                const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))
                const prepared = await prepareTx(dummyHappyTx)
                result = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })
                response = (await result.json()) as unknown as HappyTxStateSuccess
            })

            it("has proper base level structure", () => {
                expect(result.status).toBe(200)
                expect(response.status).toBe(EntryPointStatus.Success)
                expect(response.included).toBe(true)
                expect(response.simulation).toBeEmpty()
                expect(response.receipt).not.toBeEmpty()
            })
            it("has happyTxHash", () => {
                expect(response.receipt.happyTxHash).toBeString()
            })
            it("has account", () => {
                expect(response.receipt.account).toBeString()
            })
            it("has nonce", () => {
                expect(BigInt(response.receipt.nonceTrack)).toBeGreaterThanOrEqual(0n)
                expect(BigInt(response.receipt.nonceValue)).toBeGreaterThanOrEqual(0n)
            })
            it("includes entryPoint", () => {
                expect(response.receipt.entryPoint).toBeString()
            })
            it("has success entrypoint status", () => {
                expect(response.receipt.status).toBe(EntryPointStatus.Success)
            })
            it("contains happy logs", () => {
                expect(response.receipt.logs).toStrictEqual([])
            })
            it("has empty revert/failure data", () => {
                expect(response.receipt.revertData).toBe("0x")
                expect(response.receipt.failureReason).toBe("0x")
            })
            it("includes gas information", () => {
                expect(BigInt(response.receipt.gasUsed)).toBeGreaterThan(0n)
                expect(BigInt(response.receipt.gasCost)).toBeGreaterThan(0n)
            })
            it("includes the transaction receipt blob gas info", () => {
                expect(BigInt(response.receipt.txReceipt.blobGasPrice as bigint)).toBe(1n)
                expect(response.receipt.txReceipt.blobGasUsed).toBeUndefined()
            })
            it("includes the transaction receipt", () => {
                expect(response.receipt.txReceipt.transactionHash).toBeString()
                expect(response.receipt.txReceipt.blockHash).toBeString()
                expect(BigInt(response.receipt.txReceipt.blockNumber)).toBeGreaterThan(0n)
            })
            it("includes the transaction receipt contract info", () => {
                expect(response.receipt.txReceipt.contractAddress).toBe(null)
                expect(BigInt(response.receipt.txReceipt.cumulativeGasUsed)).toBeGreaterThan(0n)
                expect(BigInt(response.receipt.txReceipt.effectiveGasPrice)).toBeGreaterThan(0n)
                expect(response.receipt.txReceipt.from).toBeString()
                expect(BigInt(response.receipt.txReceipt.gasUsed)).toBeGreaterThan(0n)
                // expect(response.receipt.txReceipt.logs).toStrictEqual([])
                expect(response.receipt.txReceipt.logsBloom).toBeString()
                // expect(response.receipt.txReceipt.root).toBeString()
                expect(response.receipt.txReceipt.status).toBe("success")
                expect(response.receipt.txReceipt.to).toBeString()
                expect(response.receipt.txReceipt.transactionHash).toBeString()
                expect(Number(response.receipt.txReceipt.transactionIndex)).toBeGreaterThanOrEqual(0)
                expect(response.receipt.txReceipt.type).toBeString()
            })
        })
        it("mints tokens", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)

            const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))

            const prepared = await prepareTx(dummyHappyTx)

            const result = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })
            expect(result.status).toBe(200)

            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(afterBalance - beforeBalance).toBe(10n ** 18n)
        })

        it("can't use a too-low nonce", async () => {
            // subtract 1 from valid nonce

            const nonce = (await getNonce(smartAccount)) - 1n
            const prepared = await prepareTx(await createMockTokenAMintHappyTx(smartAccount, nonce))

            const result = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })

            expect(result.status).toBe(500)
            if (result.status !== 500) return

            const response = (await result.json()) as unknown as BaseFailedError

            expect(response.status).toBe(EntryPointStatus.ValidationFailed)
            expect(response.failureReason).toBeUndefined()
            expect(response.revertData).toBe("0x756688fe")
        })

        it("can't re-use a nonce", async () => {
            const nonce = await getNonce(smartAccount)
            const prepared = await prepareTx(await createMockTokenAMintHappyTx(smartAccount, nonce))

            const result1 = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })
            // again with same nonce
            const result2 = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })

            expect(result1.status).toBe(200)
            expect(result2.status).toBe(500)
            if (result2.status !== 500) return

            const response2 = (await result2.json()) as unknown as BaseFailedError

            expect(response2.status).toBe(EntryPointStatus.ValidationFailed)
            expect(response2.failureReason).toBeUndefined()
            expect(response2.revertData).toBe("0x756688fe")
        })

        it("fills in executeGasLimit automatically", async () => {
            const nonce = await getNonce(smartAccount)

            const tx = await createMockTokenAMintHappyTx(smartAccount, nonce)

            const encoded = await prepareTx({ ...tx, executeGasLimit: 0n })

            const result = await client.api.v1.submitter.execute.$post({ json: { tx: encoded } })

            expect(result.status).toBe(200)
        })

        it("fills in maxFeePerGas automatically", async () => {
            const nonce = await getNonce(smartAccount)

            const tx = await createMockTokenAMintHappyTx(smartAccount, nonce)

            const encoded = await prepareTx({ ...tx, maxFeePerGas: 0n })

            const result = await client.api.v1.submitter.execute.$post({ json: { tx: encoded } })

            expect(result.status).toBe(200)
        })
    })
})
