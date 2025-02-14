import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { keccak256 } from "viem"
import { app } from "#src/server"
import { createMockTokenAMintHappyTx, fundAccount, getNonce, prepareTx, testAccount } from "./utils"

const client = testClient(app)

describe("submitter_execute", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        // deploys smart account (if needed)
        smartAccount = await client.api.v1.accounts.deployAccount
            .$post({
                json: {
                    owner: testAccount.account.address,
                    // salt: increment counter to create new smartAccount
                    salt: keccak256(Uint8Array.from(Buffer.from([testAccount.account.address, 3].join("_")))),
                },
            })
            .then((a) => {
                if (a.status !== 200) throw new Error("Failed to deploy account")
                return a.json()
            })
    })

    describe("self-paying", () => {
        beforeAll(async () => {
            // faucet for self paying
            await fundAccount(smartAccount)
        })

        it("estimates gas for a token mint", async () => {
            const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))
            // be your own paymaster!
            dummyHappyTx.paymaster = smartAccount
            const encoded = await prepareTx(dummyHappyTx)

            const result = await client.api.v1.submitter.estimateGas.$post({ json: { tx: encoded } })

            expect(result.ok).toBe(true)
        })
    })

    describe("paymaster", () => {
        it("estimates gas for a token mint", async () => {
            const dummyHappyTx = await createMockTokenAMintHappyTx(smartAccount, await getNonce(smartAccount))

            const encoded = await prepareTx(dummyHappyTx)

            const result = await client.api.v1.submitter.estimateGas.$post({ json: { tx: encoded } })

            expect(result.ok).toBe(true)
            // const response = await result.json()
            // expect(response.status).toBe(EntryPointStatus.Success)
            // expect(response.included).toBe(true)
            // expect(response.receipt.txReceipt.transactionHash).toBeString()
        })
    })
})
