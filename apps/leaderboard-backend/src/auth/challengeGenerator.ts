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
 * Generates a secure challenge message for authentication
 * Following EIP-4361 (Sign-In with Ethereum) standard
 * Includes nonce and timestamps to prevent replay attacks
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
