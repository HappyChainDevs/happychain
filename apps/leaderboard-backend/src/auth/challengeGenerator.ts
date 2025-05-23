/**
 * Authentication Challenge Generator
 *
 * This module handles the creation of EIP-4361 (Sign-In with Ethereum) compliant
 * authentication challenges using Viem's SIWE utilities.
 *
 * The flow is as follows:
 * 1. Client requests a challenge with their wallet address
 * 2. Server generates a challenge message using createSiweMessage
 * 3. Server stores the challenge in the database
 * 4. Client signs the message with their wallet
 * 5. Client sends the signature back for verification
 */

import type { Address, Hex } from "@happy.tech/common"
import { hashMessage } from "viem"
import { createSiweMessage, generateSiweNonce } from "viem/siwe"
import { authConfig } from "../env"

/**
 * Interface for challenge message options
 * Following EIP-4361 Sign-In with Ethereum (SIWE) standard
 */
export interface ChallengeMessageOptions {
    /** The wallet address requesting authentication */
    walletAddress: Address
    /** Optional request ID for tracking */
    requestId?: string
    /** Optional resources to include */
    resources?: string[]
}

/**
 * Interface for challenge message response
 * Contains all data needed for verification and database storage
 */
export interface ChallengeMessage {
    /** The formatted message to be signed */
    message: string
    /** The nonce used in the message (for verification) */
    nonce: string
    /** The timestamp when the challenge was issued */
    issuedAt: string
    /** The timestamp when the challenge will expire */
    expiresAt: string
    /** The wallet address that requested the challenge */
    walletAddress: Address
    /** Message hash for verification */
    messageHash: Hex
}

/**
 * Generates a secure challenge message for authentication following EIP-4361 (SIWE) standard
 *
 * This function creates a standardized message for wallet-based authentication that includes:
 * - Domain and URI information to identify the application
 * - Wallet address of the user attempting to authenticate
 * - A cryptographically secure nonce to prevent replay attacks
 * - Timestamps for issuance and expiration to limit the validity period
 * - Optional resources that the user will be able to access
 * - Optional request ID for tracking purposes
 *
 * The message is formatted according to the EIP-4361 standard using Viem's SIWE utilities.
 * A hash of the message is also generated for database storage and verification.
 *
 * @param options Configuration options including wallet address and optional parameters
 * @returns A challenge message object with all data needed for storage and verification
 */
export function generateChallengeMessage(options: ChallengeMessageOptions): ChallengeMessage {
    const { walletAddress, requestId, resources } = options

    const domain = authConfig.domain
    const uri = authConfig.uri
    const statement = authConfig.statement
    const chainId = authConfig.chainId

    const nonce = generateSiweNonce()

    const now = new Date()
    const issuedAt = now
    const expiresAt = new Date(now.getTime() + authConfig.challengeExpirySeconds * 1000)

    const message = createSiweMessage({
        domain,
        address: walletAddress,
        statement,
        uri,
        version: "1",
        chainId,
        nonce,
        issuedAt,
        expirationTime: expiresAt,
        requestId,
        resources,
    })

    const messageHash = hashMessage(message)

    return {
        message,
        nonce,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        walletAddress,
        messageHash,
    }
}
