import type { Address, Hex } from "@happy.tech/common"
import { abis } from "@happy.tech/contracts/boop/anvil"
import { http, createPublicClient, hashMessage } from "viem"
import { localhost } from "viem/chains"
import { env } from "../env"

// ERC-1271 magic value constant
const EIP1271_MAGIC_VALUE = "0x1626ba7e"

// Singleton publicClient for all signature verifications
export const publicClient = createPublicClient({
    chain: localhost,
    transport: http(env.RPC_URL),
})

/**
 * Verifies a signature against a wallet address using ERC-1271 standard
 * Makes an RPC call to the smart contract account for signature verification
 *
 * @param walletAddress - The wallet address to verify against
 * @param message - The message that was signed
 * @param signature - The signature to verify
 * @returns Promise<boolean> - Whether the signature is valid
 */
export async function verifySignature(walletAddress: Address, message: Hex, signature: Hex): Promise<boolean> {
    try {
        const messageHash = hashMessage({ raw: message })
        const result = await publicClient.readContract({
            address: walletAddress,
            abi: abis.HappyAccountImpl,
            functionName: "isValidSignature",
            args: [messageHash, signature],
        })

        return result === EIP1271_MAGIC_VALUE
    } catch (error) {
        console.error("Error verifying signature:", error)
        return false
    }
}
