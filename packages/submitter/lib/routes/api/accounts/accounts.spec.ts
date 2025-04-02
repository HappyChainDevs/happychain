import { describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { abis, deployment } from "#lib/deployments"
import { app } from "#lib/server"
import { testAccount, testPublicClient } from "#lib/tests/utils"
import { computeHappyAccount } from "#lib/utils/computeHappyAccount"

const client = testClient(app)

describe("accounts", () => {
    describe("200", () => {
        it("should create account", async () => {
            const owner = testAccount.account.address
            const salt = "0x0000000000000000000000000000000000000000000000000000000000000001"

            const predictedAddress = await testPublicClient.readContract({
                address: deployment.ScrappyAccountFactory,
                abi: abis.ScrappyAccountFactory,
                functionName: "getAddress",
                args: [salt, owner],
            })

            const computedAddress = computeHappyAccount(salt, owner)

            const result = await client.api.v1.accounts.create
                .$post({ json: { owner, salt } })
                .then((a) => a.json())
                .then((a) => a.address)

            // Ensure its a valid address
            expect(result).toStartWith("0x")
            expect(result.length).toBe(42)

            // Ensure it matches both onchain and offchain predicted addresses
            expect(result).toBe(predictedAddress)
            expect(result).toBe(computedAddress)
        })

        it("should match onchain with offchain addresses", async () => {})
    })
})
