import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { keccak256 } from "viem"
import type { BaseFailedError } from "#src/errors"
import { app } from "#src/server"
import type { HappyTxStateSuccess } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { createMockTokenAMintHappyTx, fundAccount, getNonce, prepareTx, testAccount } from "./utils"

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
                    salt: keccak256(Uint8Array.from(Buffer.from([testAccount.account.address, 4].join("_")))),
                },
            })
            .then((a) => {
                if (a.status !== 200) throw new Error("Failed to deploy account")
                return a.json()
            }))
    })

    describe("self-paying", () => {
        beforeAll(async () => {
            // faucet for self paying
            await fundAccount(smartAccount)
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
        it("mints tokens", async () => {
            const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))

            const prepared = await prepareTx(dummyHappyTx)

            const result = await client.api.v1.submitter.execute.$post({ json: { tx: prepared } })

            expect(result.status).toBe(200)
            if (result.status !== 200) return

            const response = (await result.json()) as unknown as HappyTxStateSuccess
            expect(response.status).toBe(EntryPointStatus.Success)
            expect(response.included).toBe(true)
            expect(response.receipt.txReceipt.transactionHash).toBeString()
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
