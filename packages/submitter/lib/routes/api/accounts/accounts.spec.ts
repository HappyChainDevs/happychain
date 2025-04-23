import { describe, expect, it } from "bun:test"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { publicClient } from "#lib/clients/index"
import { abis, deployment } from "#lib/env"
import { client } from "#lib/tests/utils/client"
import { computeHappyAccount } from "#lib/utils/computeHappyAccount"

const testAccount = privateKeyToAccount(generatePrivateKey())

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

            const predictedAddress = await publicClient.readContract({
                address: deployment.HappyAccountBeaconProxyFactory,
                abi: abis.HappyAccountBeaconProxyFactory,
                functionName: "getAddress",
                args: [salt, owner],
            })

            const computedAddress = computeHappyAccount(salt, owner)
            expect(predictedAddress).toBe(computedAddress)
        })
    })
})
