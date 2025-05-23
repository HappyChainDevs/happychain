/**
 * Signature Verification Module
 *
 * This module handles cryptographic verification of signatures against wallet addresses
 * using the ERC-1271 standard for Smart Contract Accounts.
 *
 * The verification process works as follows:
 * 1. The message is hashed to create a message hash
 * 2. An RPC call is made to the wallet's isValidSignature method
 * 3. The wallet implementation validates the signature according to ERC-1271
 * 4. The result is interpreted as a boolean indicating validity
 */

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
 * @param walletAddress - The wallet address that allegedly signed the message
 * @param message - The original message that was signed (plain text)
 * @param signature - The signature produced by the wallet (hex string)
 * @returns Promise<boolean> - True if the signature is valid, false otherwise
 */
export async function verifySignature(walletAddress: Address, message: string, signature: Hex): Promise<boolean> {
    try {
        const messageHash = hashMessage(message)
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
