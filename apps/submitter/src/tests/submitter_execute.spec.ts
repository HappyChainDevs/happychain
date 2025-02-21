import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { encodeFunctionData } from "viem"
import { deployment } from "#src/deployments"
import { app } from "#src/server"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { ExecuteSuccess } from "#src/tmp/interface/submitter_execute"
import { SubmitSuccess } from "#src/tmp/interface/submitter_submit"
import { serializeBigInt } from "#src/utils/bigint-lossy"
import {
    createMockTokenAMintHappyTx,
    fundAccount,
    getMockTokenABalance,
    getNonce,
    signTx,
    testAccount,
    testPublicClient,
} from "./utils"

const client = testClient(app)

// use random nonce track so that other tests can't interfere
const nonceTrack = BigInt(Math.floor(Math.random() * 1000000))

describe("submitter_execute", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.account.address, salt: "0x1" } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.json())
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            .then((a: any) => a.address)
    })

    describe("self-paying", () => {
        beforeAll(async () => {
            // faucet for self paying
            if ((await testPublicClient.getBalance({ address: smartAccount })) < 10n ** 16n) {
                await fundAccount(smartAccount)
            }
        })

        it("mints tokens", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)
            const unsignedTx = await createMockTokenAMintHappyTx(
                smartAccount,
                await getNonce(smartAccount, nonceTrack),
                nonceTrack,
            )
            // be your own paymaster! define your own gas!
            unsignedTx.gasLimit = 2000000n
            unsignedTx.executeGasLimit = 1000000n
            unsignedTx.paymaster = smartAccount
            const signedTx = await signTx(unsignedTx)
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(result.status).toBe(200)
            expect(response.status).toBe(SubmitSuccess)
            expect(response.state.included).toBe(true)
            expect(response.state.receipt.txReceipt.transactionHash).toBeString()
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })
    })

    describe("paymaster", () => {
        it("proper response structure (mint tokens success)", async () => {
            const unsignedTx = await createMockTokenAMintHappyTx(
                smartAccount,
                await getNonce(smartAccount, nonceTrack),
                nonceTrack,
            )
            const signedTx = await signTx(unsignedTx)
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const response = (await result.json()) as any
            expect(result.status).toBe(200)
            expect(response.status).toBe(ExecuteSuccess)
            expect(response.state.included).toBe(true)
            expect(response.state.receipt).not.toBeEmpty()
            expect(response.state.receipt.happyTxHash).toBeString()
            expect(response.state.receipt.account).toBeString()
            expect(BigInt(response.state.receipt.nonceTrack)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.state.receipt.nonceValue)).toBeGreaterThanOrEqual(0n)
            expect(response.state.receipt.entryPoint).toBeString()
            expect(response.state.receipt.status).toBe(EntryPointStatus.Success)
            expect(response.state.receipt.logs[0]).toMatchObject({
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
            expect(response.state.receipt.revertData).toBe("0x")
            expect(response.state.receipt.failureReason).toBe("0x")
            expect(BigInt(response.state.receipt.gasUsed)).toBeGreaterThan(0n)
            expect(BigInt(response.state.receipt.gasCost)).toBeGreaterThan(0n)
            expect(BigInt(response.state.receipt.txReceipt.blobGasPrice || 0)).toBe(1n)
            expect(response.state.receipt.txReceipt.blobGasUsed).toBeUndefined()
            expect(response.state.receipt.txReceipt.transactionHash).toBeString()
            expect(response.state.receipt.txReceipt.blockHash).toBeString()
            expect(BigInt(response.state.receipt.txReceipt.blockNumber)).toBeGreaterThan(0n)
            expect(response.state.receipt.txReceipt.contractAddress).toBe(null)
            expect(BigInt(response.state.receipt.txReceipt.cumulativeGasUsed)).toBeGreaterThan(0n)
            expect(BigInt(response.state.receipt.txReceipt.effectiveGasPrice)).toBeGreaterThan(0n)
            expect(response.state.receipt.txReceipt.from).toBeString()
            expect(BigInt(response.state.receipt.txReceipt.gasUsed)).toBeGreaterThan(0n)
            expect(response.state.receipt.txReceipt.logs.length).toBe(1)
            expect(response.state.receipt.txReceipt.logs[0]).toMatchObject({
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
            expect(response.state.receipt.txReceipt.logsBloom).toBeString()
            expect(response.state.receipt.txReceipt.root).toBeString()
            expect(response.state.receipt.txReceipt.status).toBe("success")
            expect(response.state.receipt.txReceipt.to).toBeString()
            expect(response.state.receipt.txReceipt.transactionHash).toBeString()
            expect(Number(response.state.receipt.txReceipt.transactionIndex)).toBeGreaterThanOrEqual(0)
            expect(response.state.receipt.txReceipt.type).toBeString()
        })
        it("mints tokens", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)
            const dummyHappyTx = await createMockTokenAMintHappyTx(
                smartAccount,
                await getNonce(smartAccount, nonceTrack),
                nonceTrack,
            )
            const prepared = await signTx(dummyHappyTx)
            const response = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(prepared) } })
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("can't use a too-low nonce", async () => {
            // subtract 1 from valid nonce
            const nonce = (await getNonce(smartAccount, nonceTrack)) - 1n
            const jsonTx = await signTx(await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack))
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            // biome-ignore lint/suspicious/noExplicitAny: testing doesn't need strict types here
            const response = (await result.json()) as any

            expect(result.status).toBe(422)
            expect(response.status).toBe(EntryPointStatus.ValidationFailed)
            expect(response.failureReason).toBeUndefined()
            expect(response.revertData).toBe("InvalidNonce")
        })

        it("can't re-use a nonce", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const jsonTx = await signTx(await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack))

            const result1 = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            // again with same nonce, will fail
            const result2 = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            // biome-ignore lint/suspicious/noExplicitAny: testing doesn't need strict types here
            const response2 = (await result2.json()) as any

            expect(result1.status).toBe(200)
            expect(result2.status).toBe(422)
            expect(response2.status).toBe(EntryPointStatus.ValidationFailed)
            expect(response2.failureReason).toBeUndefined()
            expect(response2.revertData).toBe("InvalidNonce")
        })

        it("throws PaymentReverted with unsupported paymaster", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const tx = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)

            // invalid paymaster
            tx.paymaster = deployment.MockTokenA

            const jsonTx = await signTx(tx)
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const response = (await result.json()) as any

            expect(response.status).toBe(EntryPointStatus.PaymentReverted)
            expect(result.status).toBe(422)
        })

        it("throws when invalid ABI is used to make call", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const tx = await createMockTokenAMintHappyTx(smartAccount, nonce, nonceTrack)

            tx.callData = encodeFunctionData({
                abi: [{ type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" }],
                functionName: "badFunc",
                args: [],
            })

            const jsonTx = await signTx(tx)
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            // const response = await result.json()

            expect(result.status).toBe(422)
            // expect(response.status).toBe("entrypointPaymentReverted")
        })

        it("throws when using the wrong user account", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const tx = await createMockTokenAMintHappyTx(
                `0x${(BigInt(smartAccount) + 1n).toString(16)}`,
                nonce,
                nonceTrack,
            )

            const jsonTx = await signTx(tx)
            const result = await client.api.v1.submitter.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            // const response = await result.json()

            expect(result.status).toBe(422) // @note contract issue, this should throw not succeed
            // expect(response.status).toBe("entrypointPaymentReverted")
        })
    })
})
