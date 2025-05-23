import { type Address, type Hex, createUUID } from "@happy.tech/common"
import { hashMessage, toHex } from "viem"
import { authConfig } from "../env"

/**
 * Always a hex string of exactly 32 characters (16 bytes)
 */
export type AuthNonce = string & { readonly __brand: "auth_nonce" }

/**
 * Validates if a string is a valid authentication nonce
 * @param value The string to validate
 * @returns True if the string is a valid hex nonce of correct length
 */
export function isValidNonce(value: string): boolean {
    // Must be exactly 32 characters (16 bytes represented as hex)
    if (value.length !== 32) return false

    // Must be a valid hex string (each character is 0-9, a-f, A-F)
    return /^[0-9a-fA-F]{32}$/.test(value)
}

/**
 * Asserts that a string is a valid authentication nonce
 * @param value The string to validate
 * @throws Error if the string is not a valid nonce
 * @returns The validated nonce as an AuthNonce type
 */
export function assertNonce(value: string): AuthNonce {
    if (!isValidNonce(value)) {
        throw new Error(`Invalid nonce format: ${value}. Expected a 32-character hex string.`)
    }
    return value as AuthNonce
}

/**
 * Generates a cryptographically secure random nonce for authentication
 * @returns A 32-character hex string as an AuthNonce
 */
export function generateNonce(): AuthNonce {
    // Generate a UUID and convert to hex, taking only first 32 characters
    const nonce = toHex(createUUID(), { size: 32 }).slice(2)
    return assertNonce(nonce)
}

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
    /** The nonce used in the message (for verification), always a 32-char hex string */
    nonce: AuthNonce
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

    // Use configuration from environment
    const domain = authConfig.domain
    const expiresIn = authConfig.challengeExpirySeconds
    const uri = authConfig.uri
    const statement = authConfig.statement
    const chainId = authConfig.chainId

    // Generate a cryptographically secure random nonce
    const nonce = generateNonce()

    // Generate timestamps for issuance and expiration
    const now = new Date()
    const issuedAt = now.toISOString()
    const expiresAt = new Date(now.getTime() + expiresIn * 1000).toISOString()

    // Build the message parts according to EIP-4361 standard
    const messageParts = [
        `${domain} wants you to sign in with your Ethereum account:`,
        walletAddress,
        "", // Empty line
    ]

    // Add statement if provided
    if (statement) {
        messageParts.push(statement)
        messageParts.push("") // Empty line after statement
    }

    // Add the required structured data parts
    messageParts.push(
        `URI: ${uri}`,
        "Version: 1",
        `Chain ID: ${chainId}`,
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
        `Expiration Time: ${expiresAt}`,
    )

    // Add optional request ID if provided
    if (requestId) {
        messageParts.push(`Request ID: ${requestId}`)
    }

    // Add optional resources if provided
    if (resources && resources.length > 0) {
        messageParts.push("Resources:")
        for (const resource of resources) {
            messageParts.push(`- ${resource}`)
        }
    }

    // Format the final message (no EIP-191 prefix, wallet will add that)
    const message = messageParts.join("\n")

    // Generate a hash of the message for verification
    const messageHash = hashMessage(message)

    return {
        message,
        nonce,
        issuedAt,
        expiresAt,
        walletAddress,
        messageHash,
    }
}
