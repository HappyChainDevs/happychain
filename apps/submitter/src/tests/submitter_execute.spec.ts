import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { encodeFunctionData, keccak256 } from "viem"
import { deployment } from "#src/deployments"
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
            const response = (await result.json()) as unknown as HappyTxStateSuccess

            expect(result.status).toBe(200)
            expect(response.status).toBe(EntryPointStatus.Success)
            expect(response.included).toBe(true)
            expect(response.receipt.txReceipt.transactionHash).toBeString()
        })
    })

    describe("paymaster", () => {
        it("proper response structure (mint tokens success)", async () => {
            const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))
            const prepared = await prepareTx(dummyHappyTx)
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })
            const response = (await result.json()) as unknown as HappyTxStateSuccess

            expect(result.status).toBe(200)
            expect(response.status).toBe(EntryPointStatus.Success)
            expect(response.included).toBe(true)
            expect(response.simulation).toBeEmpty()
            expect(response.receipt).not.toBeEmpty()
            expect(response.receipt.happyTxHash).toBeString()
            expect(response.receipt.account).toBeString()
            expect(BigInt(response.receipt.nonceTrack)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.receipt.nonceValue)).toBeGreaterThanOrEqual(0n)
            expect(response.receipt.entryPoint).toBeString()
            expect(response.receipt.status).toBe(EntryPointStatus.Success)
            expect(response.receipt.logs).toStrictEqual([
                // TODO
            ])
            expect(response.receipt.revertData).toBe("0x")
            expect(response.receipt.failureReason).toBe("0x")
            expect(BigInt(response.receipt.gasUsed)).toBeGreaterThan(0n)
            expect(BigInt(response.receipt.gasCost)).toBeGreaterThan(0n)
            expect(BigInt(response.receipt.txReceipt.blobGasPrice as bigint)).toBe(1n)
            expect(response.receipt.txReceipt.blobGasUsed).toBeUndefined()
            expect(response.receipt.txReceipt.transactionHash).toBeString()
            expect(response.receipt.txReceipt.blockHash).toBeString()
            expect(BigInt(response.receipt.txReceipt.blockNumber)).toBeGreaterThan(0n)
            expect(response.receipt.txReceipt.contractAddress).toBe(null)
            expect(BigInt(response.receipt.txReceipt.cumulativeGasUsed)).toBeGreaterThan(0n)
            expect(BigInt(response.receipt.txReceipt.effectiveGasPrice)).toBeGreaterThan(0n)
            expect(response.receipt.txReceipt.from).toBeString()
            expect(BigInt(response.receipt.txReceipt.gasUsed)).toBeGreaterThan(0n)
            expect(response.receipt.txReceipt.logs.length).toBe(1)
            expect(response.receipt.txReceipt.logs[0]).toMatchObject({
                address: expect.any(String),
                blockHash: expect.any(String),
                blockNumber: expect.any(String),
                blockTimestamp: expect.any(String),
                data: expect.any(String),
                logIndex: expect.any(Number),
                removed: expect.any(Boolean),
                topics: expect.any(Array),
                transactionHash: expect.any(String),
                transactionIndex: expect.any(Number),
            })
            expect(response.receipt.txReceipt.logsBloom).toBeString()
            expect(response.receipt.txReceipt.root).toBeString()
            expect(response.receipt.txReceipt.status).toBe("success")
            expect(response.receipt.txReceipt.to).toBeString()
            expect(response.receipt.txReceipt.transactionHash).toBeString()
            expect(Number(response.receipt.txReceipt.transactionIndex)).toBeGreaterThanOrEqual(0)
            expect(response.receipt.txReceipt.type).toBeString()
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

            expect(result.status).toBe(422)

            const response = (await result.json()) as unknown as BaseFailedError

            expect(response.status).toBe(EntryPointStatus.ValidationFailed)
            expect(response.failureReason).toBeUndefined()
            expect(response.revertData).toBe("InvalidNonce")
        })

        it("can't re-use a nonce", async () => {
            const nonce = await getNonce(smartAccount)
            const prepared = await prepareTx(await createMockTokenAMintHappyTx(smartAccount, nonce))

            const result1 = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })
            // again with same nonce
            const result2 = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })

            expect(result1.status).toBe(200)
            expect(result2.status).toBe(422)

            const response2 = (await result2.json()) as unknown as BaseFailedError

            expect(response2.status).toBe(EntryPointStatus.ValidationFailed)
            expect(response2.failureReason).toBeUndefined()
            expect(response2.revertData).toBe("InvalidNonce")
        })

        it("throws PaymentReverted with unsupported paymaster", async () => {
            const nonce = await getNonce(smartAccount)
            const tx = await createMockTokenAMintHappyTx(smartAccount, nonce)

            tx.paymaster = deployment.MockTokenA

            const encoded = await prepareTx({ ...tx, executeGasLimit: 0n })
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: encoded } })
            const response = await result.json()

            expect(result.status).toBe(422)
            expect(response.status).toBe("entrypointPaymentReverted")
        })

        it("throws when invalid ABI is used to make call", async () => {
            const nonce = await getNonce(smartAccount)
            const tx = await createMockTokenAMintHappyTx(smartAccount, nonce)

            tx.callData = encodeFunctionData({
                abi: [{ type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" }],
                functionName: "badFunc",
                args: [],
            })

            const encoded = await prepareTx({ ...tx, executeGasLimit: 0n })
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: encoded } })
            // const response = await result.json()

            expect(result.status).toBe(422)
            // expect(response.status).toBe("entrypointPaymentReverted")
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
