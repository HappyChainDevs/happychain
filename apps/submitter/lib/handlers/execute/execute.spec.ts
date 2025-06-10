// Proxy HAS TO BE IMPORTED FIRST so that it starts before submitter starts!
import "#lib/utils/test/proxyServer"

import { beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import type { ClientResponse } from "hono/client"
import { createTestClient, encodeFunctionData } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { ExecuteError, ExecuteSuccess } from "#lib/handlers/execute"
import type { SimulateError } from "#lib/handlers/simulate"
import { blockService, boopReceiptService } from "#lib/services"
import { type Boop, Onchain, SubmitterError } from "#lib/types"
import { computeBoopHash } from "#lib/utils/boop"
import { config } from "#lib/utils/clients"
import {
    assertMintLog,
    client,
    createMintBoop,
    createSmartAccount,
    fundAccount,
    getMockTokenBalance,
    getNonce,
    mockDeployments,
    signBoop,
    withInterval,
} from "#lib/utils/test"

const testClient = createTestClient({ ...config, mode: "anvil" })
const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = async (tx: Boop) => await signBoop(testAccount, tx)

describe("submitter_execute", () => {
    let account: Address
    let nonceTrack = 0n
    let nonceValue = 0n
    let unsignedTx: Boop
    let signedTx: Boop

    beforeAll(async () => {
        await testClient.setAutomine(true)
        account = await createSmartAccount(testAccount.address)
    })

    beforeEach(async () => {
        nonceTrack = BigInt(Math.floor(Math.random() * 1_000_000_000))
        nonceValue = await getNonce(account, nonceTrack)
        unsignedTx = createMintBoop({ account, nonceValue, nonceTrack })
        signedTx = await sign(unsignedTx)
    })

    describe("repricing", () => {
        // biome-ignore format: keep indentation low
        it("reprices", withInterval(0, false, async () => {
            clearTimeout((blockService as any).blockTimeout)
            const spy = spyOn<any, string>(boopReceiptService, "replaceOrCancel")
            expect(spy).toHaveBeenCalledTimes(0)

            // will wait a 1/4 second past the minimum wait time to ensure the tx is stuck & replaced
            // before mining the next block
            setTimeout(() => testClient.mine({ blocks: 1 }), env.STUCK_TX_WAIT_TIME + 250)

            const result = await client.api.v1.boop.execute
                .$post({ json: { boop: serializeBigInt(signedTx) } })
                .then((a) => a.json())

            // at least once, should be exactly once but not specifying allows experimenting with lower stuck times
            expect(spy).toHaveBeenCalled()
            expect(result.status).toBe(Onchain.Success)
        }))
    })

    describe("self-paying", () => {
        beforeAll(async () => {
            await fundAccount(account)
        })

        it("mints tokens - self-paying", async () => {
            const beforeBalance = await getMockTokenBalance(account)

            unsignedTx = {
                ...unsignedTx,
                // be your own payer! define your own gas!
                payer: account,
                gasLimit: 4_000_000,
                executeGasLimit: 1_000_000,
                validateGasLimit: 1_000_000,
                maxFeePerGas: 2_000_000_000n,
            }
            const signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as unknown as ExecuteSuccess
            const afterBalance = await getMockTokenBalance(account)
            expect(result.status).toBe(200)
            expect(response.status).toBe(Onchain.Success)
            expect(response.receipt.evmTxHash).toBeString()
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("fails if signing over 0 gas values", async () => {
            unsignedTx = {
                ...unsignedTx,
                executeGasLimit: 0,
                payer: account,
                gasLimit: 0,
            }
            signedTx = await sign(unsignedTx)
            const json = { json: { boop: serializeBigInt(signedTx) } }
            const results = (await client.api.v1.boop.execute.$post(json)) as ClientResponse<SimulateError>
            const response = (await results.json()) as ExecuteError
            expect(response.status).toBe(SubmitterError.InvalidValues)
            expect(response.stage).toBe("simulate")
            expect(results.status).toBe(400)
        })
    })

    describe("payer", () => {
        it("proper response structure (mint tokens success)", async () => {
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as unknown as ExecuteSuccess
            expect(result.status).toBe(200)
            expect(response.status).toBe(Onchain.Success)
            expect(response.receipt).not.toBeEmpty()
            expect(response.receipt.boopHash).toBeString()
            expect(response.receipt.status).toBe(Onchain.Success)
            expect(response.receipt.error).toBeString()
            expect(response.receipt.entryPoint).toBeString()

            expect(response.receipt.revertData).toBe("0x")
            expect(response.receipt.evmTxHash).toBeString()
            expect(response.receipt.blockHash).toBeString()
            expect(BigInt(response.receipt.blockNumber)).toBeGreaterThan(0n)
            expect(BigInt(response.receipt.gasPrice)).toBeGreaterThan(0n)
            expect(response.receipt.logs.length).toBe(1)
            expect(response.receipt.logs[0]).toMatchObject({
                address: expect.any(String),
                topics: expect.any(Array),
                data: expect.any(String),
            })
            expect(response.receipt.boop.account).toBeString()
            expect(response.receipt.boop.dest).toBeString()
            expect(response.receipt.boop.payer).toBeString()
            expect(BigInt(response.receipt.boop.value)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.receipt.boop.nonceTrack)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.receipt.boop.nonceValue)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.receipt.boop.maxFeePerGas)).toBeGreaterThanOrEqual(0n)
            expect(BigInt(response.receipt.boop.submitterFee)).toBeGreaterThanOrEqual(0n)
            expect(response.receipt.boop.gasLimit).toBeGreaterThan(0)
            expect(response.receipt.boop.validateGasLimit).toBeGreaterThan(0)
            expect(response.receipt.boop.validatePaymentGasLimit).toBeGreaterThanOrEqual(0)
            expect(response.receipt.boop.executeGasLimit).toBeGreaterThan(0)
            expect(response.receipt.boop.callData).toBeString()
            expect(response.receipt.boop.validatorData).toBeString()
            expect(response.receipt.boop.extraData).toBeString()
        })

        it("mints tokens (payer)", async () => {
            const beforeBalance = await getMockTokenBalance(account)

            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenBalance(account)
            assertMintLog(response.receipt, account)
            expect(response.status).toBe(Onchain.Success)
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("executes with 0n gas", async () => {
            const beforeBalance = await getMockTokenBalance(account)
            unsignedTx.executeGasLimit = 0
            unsignedTx.gasLimit = 0
            signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            assertMintLog(response.receipt, account)
            const afterBalance = await getMockTokenBalance(account)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("executes with 10_000_000n gas", async () => {
            const beforeBalance = await getMockTokenBalance(account)
            unsignedTx.executeGasLimit = 8_000_000
            unsignedTx.gasLimit = 10_000_000
            signedTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(signedTx) } })
            const response = (await result.json()) as any
            const afterBalance = await getMockTokenBalance(account)
            assertMintLog(response.receipt, account)
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(200)
            expect(afterBalance).toBeGreaterThan(beforeBalance)
        })

        it("can't use a too-low nonce", async () => {
            // execute tx with nonce, then another with nonce+1, wait for both to complete
            // this is to ensure that the nonce value is above `0` so that we don't fail for having a
            // _negative_ nonce
            const tx1 = await sign(createMintBoop({ account, nonceValue, nonceTrack }))
            await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(tx1) } })

            // mints a different amount of tokens, computes a difference hash, same nonce though
            const jsonTx = await sign(createMintBoop({ account, nonceValue, nonceTrack, amount: 5n * 10n ** 18n }))
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as ExecuteError
            expect(result.status).toBe(400)
            expect(response.stage).toBe("simulate")
            expect(response.status).toBe(Onchain.InvalidNonce)
        })

        it("can't re-use a nonce", async () => {
            const nonceValue = await getNonce(account, nonceTrack)
            const jsonTx1 = await sign(createMintBoop({ account, nonceValue, nonceTrack, amount: 10n ** 18n }))
            const jsonTx2 = await sign(createMintBoop({ account, nonceValue, nonceTrack, amount: 2000n ** 18n }))

            const result1 = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx1) } })
            // again with same nonce, will fail
            const result2 = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx2) } })
            const [response1, response2] = (await Promise.all([result1.json(), result2.json()])) as [any, any]
            expect(response1.error).toBeUndefined()
            expect(response2.error).toBeUndefined()
            expect(result1.status).toBe(200)
            expect(result2.status).toBe(400)
            expect(response2.stage).toBe("simulate")
            expect(response2.status).toBe(Onchain.InvalidNonce)
        })

        it("should fail with out of range future nonce", async () => {
            unsignedTx = {
                ...unsignedTx,
                nonceValue: 1000_000_000_000n + BigInt(Math.floor(Math.random() * 10_000_000)),
            }
            const jsonTx = await sign(unsignedTx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any
            expect(response.status).toBe(SubmitterError.NonceTooFarAhead)
            expect(result.status).toBe(422)
        })

        it("throws error when PaymentReverted with unsupported payer", async () => {
            const nonceValue = await getNonce(account, nonceTrack)
            const tx = {
                ...createMintBoop({ account, nonceValue, nonceTrack }),
                // invalid payer
                payer: mockDeployments.MockTokenA,
            }

            const jsonTx = await sign(tx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.status).toBe(Onchain.PaymentValidationReverted)
            expect(result.status).toBe(422)
        })

        it("throws when invalid ABI is used to make call", async () => {
            const nonceValue = await getNonce(account, nonceTrack)
            const baseTx = createMintBoop({ account, nonceValue, nonceTrack })

            const jsonTx = await sign({
                ...baseTx,
                callData: encodeFunctionData({
                    abi: [
                        { type: "function", name: "badFunc", inputs: [], outputs: [], stateMutability: "nonpayable" },
                    ],
                    functionName: "badFunc",
                    args: [],
                }),
            })
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any

            expect(response.error).toBeUndefined() // ok its failed, should be standard error tho
            expect(result.status).toBe(422)
            expect(response.status).toBe(Onchain.CallReverted)
        })

        it("throws when using the wrong user account", async () => {
            const tx = createMintBoop({
                account: `0x${(BigInt(account) + 1n).toString(16).padStart(40, "0")}`,
                nonceValue,
                nonceTrack,
            })

            const jsonTx = await sign(tx)
            const result = await client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(jsonTx) } })
            const response = (await result.json()) as any
            expect(response.error).toBeUndefined()
            expect(result.status).toBe(422)
            expect(response.status).toBe(Onchain.ValidationReverted)
        })

        it("executes 50 'mint token' tx's quickly and successfully.", async () => {
            const count = 50
            // test only works if submitter is configured to allow more than 50
            expect(env.MAX_BLOCKED_PER_TRACK).toBeGreaterThanOrEqual(count)
            expect(env.MAX_TOTAL_BLOCKED).toBeGreaterThanOrEqual(count)

            const boops = await Promise.all(
                Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonceValue) => {
                    const dummyBoop = createMintBoop({ account, nonceValue, nonceTrack })
                    return await sign(dummyBoop)
                }),
            )

            const results = await Promise.all(
                boops.map((tx) => client.api.v1.boop.execute.$post({ json: { boop: serializeBigInt(tx) } })),
            ).then(async (a) => await Promise.all(a.map((b) => b.json() as any)))
            expect(results).toHaveLength(count)
            results.forEach((r, i) => {
                expect(r.status, `boop with hash ${computeBoopHash(env.CHAIN_ID, boops[i])}`).toBe(Onchain.Success)
                expect(r.receipt.status, `receipt.status at index ${i}`).toBe(Onchain.Success)
                expect(r.receipt.evmTxHash, `evmTxHash at index ${i}`).toEqual(expect.any(String))
                assertMintLog(r.receipt, account)
            })
        })
    })
})
