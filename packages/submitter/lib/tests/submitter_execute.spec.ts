import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { encodeFunctionData } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { Boop } from "#lib/interfaces/Boop"
import { ExecuteSuccess } from "#lib/interfaces/boop_execute"
import { SubmitSuccess } from "#lib/interfaces/boop_submit"
import { EntryPointStatus } from "#lib/interfaces/status"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import { createMockTokenAMintBoop, fundAccount, getMockTokenABalance, getNonce, mockDeployments, signTx } from "./utils"
import { client } from "./utils/client"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = async (tx: Boop) => await signTx(testAccount, tx)

describe("submitter_execute", () => {
    let smartAccount: `0x${string}`
    let nonceTrack = 0n
    let nonceValue = 0n
    let unsignedTx: Boop
    let signedTx: Boop

    beforeAll(async () => {
        smartAccount = await client.api.v1.accounts.create
            .$post({ json: { owner: testAccount.address, salt: "0x1" } })
            .then((a) => a.json())
            .then((a) => a.address)
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
            unsignedTx.gasLimit = 2000000n
            unsignedTx.executeGasLimit = 1000000n
            unsignedTx.payer = smartAccount
            const signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(response.status).toBe(SubmitSuccess)
            expect(response.state.included).toBe(true)
            expect(response.state.receipt.txReceipt.transactionHash).toBeString()
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })
    })

    describe("payer", () => {
        it("proper response structure (mint tokens success)", async () => {
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(response.status).toBe(ExecuteSuccess)
            expect(response.state.included).toBe(true)
            expect(response.state.receipt).not.toBeEmpty()
            expect(response.state.receipt.boopHash).toBeString()
            expect(response.state.receipt.account).toBeString()
            expect(BigInt(response.state.receipt.nonceTrack)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.state.receipt.nonceValue)).toBeGreaterThanOrEqual(0n)
            expect(response.state.receipt.entryPoint).toBeString()
            expect(response.state.receipt.status).toBe(EntryPointStatus.Success)
            expect(response.state.receipt.logs.length).toBe(0) // only emits errors on failure currently
            expect(response.state.receipt.revertData).toBe("0x")
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
            expect(response.state.receipt.txReceipt.logs.length).toBe(3)
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
            // expect(response.state.receipt.txReceipt.root).toBeString()
            expect(response.state.receipt.txReceipt.status).toBe("success")
            expect(response.state.receipt.txReceipt.to).toBeString()
            expect(response.state.receipt.txReceipt.transactionHash).toBeString()
            expect(Number(response.state.receipt.txReceipt.transactionIndex)).toBeGreaterThanOrEqual(0)
            expect(response.state.receipt.txReceipt.type).toBeString()
        })

        it("mints tokens", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)

            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any

            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("executes with 0n gas", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)
            unsignedTx.executeGasLimit = 0n
            unsignedTx.gasLimit = 0n
            signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenABalance(smartAccount)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("executes with 4000000000n gas", async () => {
            const beforeBalance = await getMockTokenABalance(smartAccount)
            unsignedTx.executeGasLimit = 4000000000n
            unsignedTx.gasLimit = 4000000000n
            signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(signedTx) } })
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
            const tx2 = await sign(createMockTokenAMintBoop(smartAccount, nonceValue + 1n, nonceTrack))
            await Promise.all([
                client.api.v1.boop.execute.$post({
                    json: { tx: serializeBigInt(tx1) },
                }),
                client.api.v1.boop.execute.$post({
                    json: { tx: serializeBigInt(tx2) },
                }),
            ])

            const jsonTx = await sign(
                // mints a different amount of tokens, computes a difference hash, same nonce though
                createMockTokenAMintBoop(smartAccount, nonceValue + 1n, nonceTrack, 5n * 10n ** 18n),
            )
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.error).toBeUndefined()
            expect(result.status).toBe(422)
            expect(response.revertData).toBe("InvalidNonce")
            expect(response.status).toBe(EntryPointStatus.UnexpectedReverted)
        })

        it("can't re-use a nonce", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const jsonTx = await sign(createMockTokenAMintBoop(smartAccount, nonce, nonceTrack))

            const result1 = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            // again with same nonce, will fail
            const result2 = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            const [response1, response2] = (await Promise.all([result1.json(), result2.json()])) as [any, any]
            expect(response1.error).toBeUndefined()
            expect(response2.error).toBeUndefined()
            expect(result1.status).toBe(200)
            expect(result2.status).toBe(422)
            expect(response2.revertData).toBe("InvalidNonce")
            expect(response2.status).toBe(EntryPointStatus.UnexpectedReverted)
        })

        it("should fail with out of range future nonce", async () => {
            unsignedTx.nonceValue = 1000_000_000_000n + BigInt(Math.floor(Math.random() * 10_000_000))
            const jsonTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any
            expect(response.status).toBe("submitterUnexpectedError")
            expect(result.status).toBe(422)
        })

        it("throws error when PaymentReverted with unsupported payer", async () => {
            const nonce = await getNonce(smartAccount, nonceTrack)
            const tx = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)

            // invalid payer
            tx.payer = mockDeployments.MockTokenA

            const jsonTx = await sign(tx)
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.status).toBe(EntryPointStatus.PaymentValidationReverted)
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
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.error).toBeUndefined() // ok its failed, should be standard error tho
            expect(result.status).toBe(422)
            expect(response.status).toBe("entrypointCallReverted")
        })

        it("throws when using the wrong user account", async () => {
            const tx = createMockTokenAMintBoop(
                `0x${(BigInt(smartAccount) + 1n).toString(16).padStart(40, "0")}`,
                nonceValue,
                nonceTrack,
            )

            const jsonTx = await sign(tx)
            const result = await client.api.v1.boop.execute.$post({ json: { tx: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(422)
            expect(response.status).toBe("entrypointValidationReverted")
        })
    })
})
