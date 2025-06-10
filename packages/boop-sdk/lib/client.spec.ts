import { describe, expect, it } from "bun:test"
import { deployment } from "@happy.tech/contracts/boop/anvil"
import { anvil } from "viem/chains"
import { BoopClient, type BoopClientConfig } from "./client"
import { GetNonce } from "./types/GetNonce"

const setupOptions = {
    submitterUrl: "http://localhost:3001",
    rpcUrl: anvil.rpcUrls.default.http[0],
    entryPoint: deployment.EntryPoint,
} satisfies BoopClientConfig

describe("BoopClient", () => {
    const client = new BoopClient(setupOptions)

    it("should get a nonce", async () => {
        const nonceTrack = BigInt(Math.floor(Math.random() * 1000000000000000000))
        const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

        const response = await client.getNonce({ address, nonceTrack })
        expect(response.status).toBe(GetNonce.Success)
        if (response.status !== GetNonce.Success) throw new Error("getNonce response is not success")
        expect(response.address).toEqual(address)
        expect(response.nonceTrack).toEqual(nonceTrack)
        expect(response.nonceValue).toEqual(0n)
    })
})
