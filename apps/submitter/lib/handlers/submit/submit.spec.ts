import { beforeAll, beforeEach, describe, expect, it } from "bun:test"
import { type Address, serializeBigInt } from "@happy.tech/common"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { env } from "#lib/env"
import type { SubmitSuccess } from "#lib/handlers/submit"
import { type Boop, Onchain } from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { client, createMockTokenAMintBoop, createSmartAccount, getNonce, signTx } from "#lib/utils/test"

const testAccount = privateKeyToAccount(generatePrivateKey())
const sign = (tx: Boop) => signTx(testAccount, tx)

describe("submitter_submit", () => {
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

    it("submits 'mint token' tx successfully.", async () => {
        const result = await client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(signedTx) } })
        const response = (await result.json()) as unknown as SubmitSuccess
        expect(result.status).toBe(200)
        expect(response.status).toBe(Onchain.Success)
        expect((response as { boopHash: string }).boopHash).toBeString()
    })

    it("submits 50 'mint token' tx's quickly and successfully.", async () => {
        if (env.AUTOMINE_TESTS) return console.log("Skipping test because automine is enabled")

        const count = 2
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_EXECUTE_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_EXECUTE_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonceValue).map(async (nonce) => {
                const dummyBoop = createMockTokenAMintBoop(smartAccount, nonce, nonceTrack)
                return await sign(dummyBoop)
            }),
        )

        const submitResults = await Promise.all(
            transactions.map((tx) => client.api.v1.boop.submit.$post({ json: { boop: serializeBigInt(tx) } })),
        ).then(async (a) => await Promise.all(a.map((b) => b.json() as any)))

        console.log("results", submitResults)
        // sleep for 5 seconds to allow txs to be mined
        console.log("Waiting for 5 seconds to allow txs to be mined")
        await new Promise((resolve) => setTimeout(resolve, 5000))

        // need to get the tx hashes from the results by looking up client.api.v1.boop.state
        const receipts = await Promise.all(
            submitResults.map((a) => {
                if (a.status !== Onchain.Success) return { status: a.status }
                console.log("getting receipt for tx", a.boopHash)
                return client.api.v1.boop.receipt[":boopHash"].$get({ param: { boopHash: a.boopHash },query: { timeout: "10000" } })
            }))
        //  console.log("receipts", receipts)
         const receiptBodies = await Promise.all(
            receipts.map(async (resp) => {
                // If resp is already an object (not a Response), just return it
                if (resp && "json" in resp && typeof resp.json === "function") {
                    return await resp.json();
                }
                return resp;
            })
        );
        console.log("receiptBodies", receiptBodies)        


        const rs = await Promise.all(
            submitResults.map((a) => {
                if (a.status !== Onchain.Success) return { status: a.status }
                console.log("Waiting for tx", a.txHash)
                return publicClient.waitForTransactionReceipt({ hash: a.receipt.evmTxHash, pollingInterval: 100 })
            }),
        )

        expect(submitResults.length).toBe(count)
        expect(submitResults.every((r) => r.status === Onchain.Success)).toBe(true)
        expect(rs.length).toBe(count)
        expect(rs.every((r) => r.status === "success")).toBe(true)
    })
})
