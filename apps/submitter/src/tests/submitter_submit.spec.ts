import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { keccak256 } from "viem"
import { app } from "#src/server"
import { SubmitSuccess } from "#src/tmp/interface/submitter_submit"
import { createMockTokenAMintHappyTx, getNonce, prepareTx, testAccount } from "./utils"

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
})
