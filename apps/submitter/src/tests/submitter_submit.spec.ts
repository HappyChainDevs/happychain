import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { keccak256 } from "viem"
import env from "#src/env"
import { app } from "#src/server"
import { SubmitSuccess } from "#src/tmp/interface/submitter_submit"
import { createMockTokenAMintHappyTx, getNonce, prepareTx, testAccount, testPublicClient } from "./utils"

const client = testClient(app)

describe("submitter_submit", () => {
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

    it("submits mints token tx.", async () => {
        const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))
        const prepared = await prepareTx(dummyHappyTx)

        const result = await client.api.v1.submitter.submit.$post({ json: { tx: prepared } })

        expect(result.status).toBe(200)
        const response = await result.json()

        expect(response.status).toBe(SubmitSuccess)
        expect((response as { hash: string }).hash).toBeString()
    })

    it("submits 50 mints token tx quickly.", async () => {
        const nonce = await getNonce(smartAccount)
        const count = 50
        // test only works if submitter is configured to allow more than 50
        expect(env.LIMITS_SUBMIT_BUFFER_LIMIT).toBeGreaterThanOrEqual(count)
        expect(env.LIMITS_SUBMIT_MAX_CAPACITY).toBeGreaterThanOrEqual(count)

        const transactions = await Promise.all(
            Array.from({ length: count }, (_, idx) => BigInt(idx) + nonce).map(async (nonce) => {
                const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, nonce)
                return await prepareTx(dummyHappyTx)
            }),
        )

        const results = await Promise.all(
            transactions.map((tx) => client.api.v1.submitter.submit.$post({ json: { tx } })),
        ).then(async (a) => await Promise.all(a.map((b) => b.json())))

        expect(results.length).toBe(count)
        expect(results.every((r) => r.status === "submitSuccess")).toBe(true)

        const rs = await Promise.all(
            results.map((a) => {
                return testPublicClient.waitForTransactionReceipt({ hash: a.hash, pollingInterval: 100 })
            }),
        )

        expect(rs.length).toBe(count)
        expect(rs.every((r) => r.status === "success")).toBe(true)
    })
})
