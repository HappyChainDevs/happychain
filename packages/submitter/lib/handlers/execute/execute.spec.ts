import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import type { ClientResponse } from "hono/client"
import { encodeFunctionData } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { ExecuteOutput } from "#lib/handlers/execute"
import type { SimulateFailed } from "#lib/handlers/simulate"
import { type Boop, SubmitterError } from "#lib/types"
import { Onchain } from "#lib/types"

import {
    createMockTokenAMintBoop,
    fundAccount,
    getMockTokenABalance,
    getNonce,
    mockDeployments,
    signTx,
} from "#lib/utils/test"
import { client, createSmartAccount } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = async (tx: Boop) => await signTx(testAccount, tx)

describe("submitter_execute", () => {
    let smartAccount: Address
    let nonceTrack = 0n
    let nonceValue = 0n
    let unsignedTx: Boop
    let signedTx: Boop

    beforeAll(async () => {
        smartAccount = await createSmartAccount(testAccount.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(smartAccount, nonceTrack)
        unsignedTx = createMockTokenAMintBoop(smartAccount, nonceValue, nonceTrack)
        signedTx = await sign(unsignedTx)
    })

    describe("self-paying", () => {
        beforeAll(async () => {
            await fundAccount(smartAccount)
        })

        it("mints tokens", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)
            // be your own payer! define your own gas!
            unsignedTx.gasLimit = 25_000_000
            unsignedTx.executeGasLimit = 25_000_000
            unsignedTx.validateGasLimit = 25_000_000
            unsignedTx.validatePaymentGasLimit = 25_000_000
            unsignedTx.payer = smartAccount
            const signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(response.status).toBe(Onchain.Success)
            expect(response.receipt.txReceipt.transactionHash).toBeString()
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it.skip("foobar this fails somehow ??", async () => {
            unsignedTx.payer = smartAccount
            unsignedTx.executeGasLimit = 0
            unsignedTx.gasLimit = 0
            signedTx = await sign(unsignedTx)
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await client.api.v1.boop.execute.$post(json)) as ClientResponse<SimulateFailed>
            const response = (await results.json()) as ExecuteOutput
            console.log(response)
            expect(results.status).toBe(200)
            expect(response.status).toBe(Onchain.Success)
        })
    })

    describe("payer", () => {
        it("proper response structure (mint tokens success)", async () => {
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(response.status).toBe(Onchain.Success)
            expect(response.receipt).not.toBeEmpty()
            expect(response.receipt.boopHash).toBeString()
            expect(response.receipt.account).toBeString()
            expect(BigInt(response.receipt.nonceTrack)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.receipt.nonceValue)).toBeGreaterThanOrEqual(0n)
            expect(response.receipt.entryPoint).toBeString()
            expect(response.receipt.status).toBe(Onchain.Success)
            expect(response.receipt.logs.length).toBe(0) // only emits errors on failure currently // TODO populate
            expect(response.receipt.revertData).toBe("0x")
            expect(BigInt(response.receipt.gasUsed)).toBeGreaterThan(0n)
            expect(BigInt(response.receipt.gasCost)).toBeGreaterThan(0n)
            expect(BigInt(response.receipt.txReceipt.blobGasPrice || 0)).toBe(1n)
            expect(response.receipt.txReceipt.blobGasUsed).toBeUndefined()
            expect(response.receipt.txReceipt.transactionHash).toBeString()
            expect(response.receipt.txReceipt.blockHash).toBeString()
            expect(BigInt(response.receipt.txReceipt.blockNumber)).toBeGreaterThan(0n)
            expect(response.receipt.txReceipt.contractAddress).toBe(null)
            expect(BigInt(response.receipt.txReceipt.cumulativeGasUsed)).toBeGreaterThan(0n)
            expect(BigInt(response.receipt.txReceipt.effectiveGasPrice)).toBeGreaterThan(0n)
            expect(response.receipt.txReceipt.from).toBeString()
            expect(BigInt(response.receipt.txReceipt.gasUsed)).toBeGreaterThan(0n)
            expect(response.receipt.txReceipt.logs.length).toBe(3)
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
            expect(response.receipt.txReceipt.status).toBe("success")
            expect(response.receipt.txReceipt.to).toBeString()
            expect(response.receipt.txReceipt.transactionHash).toBeString()
            expect(Number(response.receipt.txReceipt.transactionIndex)).toBeGreaterThanOrEqual(0)
            expect(response.receipt.txReceipt.type).toBeString()
        })

        it("mints tokens", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)

            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.status).toBe(Onchain.Success)
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("executes with 0n gas", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)
            unsignedTx.executeGasLimit = 0
            unsignedTx.gasLimit = 0
            signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("executes with 25_000_000n gas", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)
            unsignedTx.executeGasLimit = 25_000_000
            unsignedTx.gasLimit = 25_000_000
            signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("can't use a too-low nonce", async () => {
            // execute tx with nonce, then another with nonce+1, wait for both to complete
            // this is to ensure that the nonce value is above `0` so that we don't fail for having a
            // _negative_ nonce
            const tx1 = await sign(createMockTokenAMintBoop(smartAccount, nonceValue, nonceTrack))
            await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(tx1) } })

            // mints a different amount of tokens, computes a difference hash, same nonce though
            const jsonTx = await sign(createMockTokenAMintBoop(smartAccount, nonceValue, nonceTrack, 5n * 10n ** 18n))
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.error).toBeUndefined()
            expect(result.status).toBe(400)
            expect(response.stage).toBe("simulate")
            expect(response.status).toBe(Onchain.InvalidNonce)
        })

        it("can't re-use a nonce", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const jsonTx = await sign(createMockTokenAMintBoop(smartAccount, nonce, nonceTrack))

            const result1 = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            // again with same nonce, will fail
            const result2 = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const [response1, response2] = (await Promise.all([result1.json(), result2.json()])) as [any, any]
            expect(response1.error).toBeUndefined()
            expect(response2.error).toBeUndefined()
            expect(result1.status).toBe(200)
            expect(result2.status).toBe(400)
            expect(response2.stage).toBe("simulate")
            expect(response2.status).toBe(Onchain.InvalidNonce)
        })

        it("should fail with out of range future nonce", async () => {
            unsignedTx.nonceValue = 1000_000_000_000n + BigInt(Math.floor(Math.random() * 10_000_000))
            const jsonTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any
            expect(response.status).toBe(SubmitterError.UnexpectedError)
            expect(result.status).toBe(500)
        })

        it("throws error when PaymentReverted with unsupported payer", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const tx = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)

            // invalid payer
            tx.payer = mockDeployments.MockTokenA

            const jsonTx = await sign(tx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.status).toBe(Onchain.PaymentValidationReverted)
            expect(result.status).toBe(422)
        })

        it("throws when invalid ABI is used to make call", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const tx = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)

            tx.callData = encodeFunctionData({
                abi: [{ type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" }],
                functionName: "badFunc",
                args: [],
            })

            const jsonTx = await sign(tx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.error).toBeUndefined() // ok its failed, should be standard error tho
            expect(result.status).toBe(422)
            expect(response.status).toBe(Onchain.CallReverted)
        })

        it("throws when using the wrong user account", async () => {
            const tx = createMockTokenAMintBoop(
                `0x${(BigInt(smartAccount) + 1n).toString(16).padStart(40, "0")}`,
                nonceValue,
                nonceTrack,
            )

            const jsonTx = await sign(tx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(422)
            expect(response.status).toBe(Onchain.ValidationReverted)
        })
    })
})
