import { describe, expect, it } from "bun:test"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { publicClient } from "#lib/clients"
import { abis, deployment } from "#lib/env"
import { createSmartAccount } from "#lib/tests/utils/client"
import { computeHappyAccountAddress } from "#lib/utils/computeHappyAccountAddress"

const testAccount = privateKeyToAccount(generatePrivateKey())

describe("routes: api/accounts", () => {
    describe("200", () => {
        it("should create account", async () => {
            const owner = testAccount.address
            const accountAddress = await createSmartAccount(owner)
            // Ensure its a valid address
            expect(accountAddress).toStartWith("0x")
            expect(accountAddress.length).toBe(42)
            expect(BigInt(accountAddress)).toBeGreaterThan(0n)
        })

        it("should match onchain with offchain addresses", async () => {
            const owner = testAccount.address
            const salt = "0x0000000000000000000000000000000000000000000000000000000000000001"

            const predictedAddress = await publicClient.readContract({
                address: deployment.HappyAccountBeaconProxyFactory,
                abi: abis.HappyAccountBeaconProxyFactory,
                functionName: "getAddress",
                args: [salt, owner],
            })

            const computedAddress = computeHappyAccountAddress(salt, owner)
            expect(predictedAddress).toBe(computedAddress)
        })
    })
})
