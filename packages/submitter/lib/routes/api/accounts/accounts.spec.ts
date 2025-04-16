import { describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { abis } from "#lib/deployments"
import env from "#lib/env"
import { app } from "#lib/server"
import { testPublicClient } from "#lib/tests/utils"
import { computeHappyAccount } from "#lib/utils/computeHappyAccount"

const testAccount = privateKeyToAccount(generatePrivateKey())
const client = testClient(app)

describe("routes: api/accounts", () => {
    describe("200", () => {
        it("should create account", async () => {
            const owner = testAccount.address
            const salt = "0x0000000000000000000000000000000000000000000000000000000000000001"

            const result = await client.api.v1.accounts.create
                .$post({ json: { owner, salt } })
                .then((a) => a.json())
                .then((a) => a.address)

            // Ensure its a valid address
            expect(result).toStartWith("0x")
            expect(result.length).toBe(42)
            expect(BigInt(result)).toBeGreaterThan(0n)
        })

        // TODO: erc1967_creation_code.ts is incorrect for now
        it.skip("should match onchain with offchain addresses", async () => {
            const owner = testAccount.address
            const salt = "0x0000000000000000000000000000000000000000000000000000000000000001"

            const predictedAddress = await testPublicClient.readContract({
                address: env.DEPLOYMENT_ACCOUNT_FACTORY,
                abi: abis.HappyAccountBeaconProxyFactory,
                functionName: "getAddress",
                args: [salt, owner],
            })

            const computedAddress = computeHappyAccount(salt, owner)
            expect(predictedAddress).toBe(computedAddress)
        })
    })
})
