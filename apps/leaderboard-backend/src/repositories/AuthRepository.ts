import { createUUID } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import { hashMessage } from "viem"
import { generateChallengeMessage } from "../auth/challengeGenerator"
import type {
    AuthChallenge,
    AuthSession,
    AuthSessionTableId,
    Database,
    NewAuthChallenge,
    NewAuthSession,
    UserTableId,
} from "../db/types"

export class AuthRepository {
    constructor(private db: Kysely<Database>) {}

    /**
     * Creates a new authentication session for a user
     * @param userId The ID of the user to create a session for
     * @param walletAddress The primary wallet address for the session
     * @returns The created session, or undefined if an error occurred
     */
    async createSession(userId: UserTableId, walletAddress: Address): Promise<AuthSession | undefined> {
        try {
            const now = new Date()

            const newSession: NewAuthSession = {
                id: createUUID(),
                user_id: userId,
                primary_wallet: walletAddress,
                created_at: now.toISOString(),
                last_used_at: now.toISOString(),
            }

            await this.db.insertInto("auth_sessions").values(newSession).executeTakeFirstOrThrow()

            return {
                ...newSession,
                created_at: now,
                last_used_at: now,
            }
        } catch (error) {
            console.error("Error creating session:", error)
            return undefined
        }
    }

    /**
     * Verifies an authentication session
     * @param sessionId The ID of the session to verify
     * @returns The updated session, or undefined if the session doesn't exist
     */
    async verifySession(sessionId: AuthSessionTableId): Promise<AuthSession | undefined> {
        try {
            // Single-query approach: update timestamp, check user exists, return updated session
            const session = await this.db
                .updateTable("auth_sessions")
                .set({ last_used_at: new Date().toISOString() })
                .where("id", "=", sessionId)
                .where(({ exists, selectFrom }) =>
                    exists(selectFrom("users").select("users.id").whereRef("users.id", "=", "auth_sessions.user_id")),
                )
                .returning([
                    "auth_sessions.id",
                    "auth_sessions.user_id",
                    "auth_sessions.primary_wallet",
                    "auth_sessions.created_at",
                    "auth_sessions.last_used_at",
                ])
                .executeTakeFirst()

            // If no rows matched our criteria (session not found or user doesn't exist)
            if (!session) {
                return undefined
            }

            // The session object already has the correct types, and last_used_at is
            // already up-to-date with the new timestamp
            return session
        } catch (error) {
            console.error("Error verifying session:", error)
            return undefined
        }
    }

    /**
     * Gets all active sessions for a user
     * @param userId The ID of the user to get sessions for
     * @returns An array of sessions, or an empty array if none exist
     */
    async getUserSessions(userId: UserTableId): Promise<AuthSession[]> {
        try {
            return await this.db.selectFrom("auth_sessions").where("user_id", "=", userId).selectAll().execute()
        } catch (error) {
            console.error("Error getting user sessions:", error)
            return []
        }
    }

    /**
     * Generates a new authentication challenge for a wallet address
     * @param walletAddress Ethereum wallet address requesting authentication
     * @param resources Optional resources to include in the challenge message
     * @param requestId Optional request ID for tracking
     * @returns The created challenge with message to be signed
     */
    async createChallenge(
        walletAddress: Address,
        resources?: string[],
        requestId?: string,
    ): Promise<AuthChallenge & { message: string }> {
        // Generate a challenge message using the EIP-4361 compliant generator
        const challenge = generateChallengeMessage({
            walletAddress,
            resources,
            requestId,
        })

        // Clean up expired challenges first to prevent DB bloat
        await this._cleanupExpiredChallenges(walletAddress)

        // Create the new challenge record in the database
        const newChallenge: NewAuthChallenge = {
            primary_wallet: walletAddress,
            nonce: challenge.nonce,
            message_hash: challenge.messageHash,
            expires_at: challenge.expiresAt,
            created_at: challenge.issuedAt,
            used: false,
        }

        // Store the challenge in the database
        const dbChallenge = await this.db
            .insertInto("auth_challenges")
            .values(newChallenge)
            .returning(["id", "primary_wallet", "nonce", "message_hash", "expires_at", "created_at", "used"])
            .executeTakeFirstOrThrow()

        return {
            ...dbChallenge,
            message: challenge.message,
        }
    }

    /**
     * Validate an authentication challenge using the original signed message
     * @param walletAddress The wallet address that requested the challenge
     * @param signedMessage The message that was signed by the wallet
     * @returns True if the challenge is valid, false otherwise
     */
    async validateChallenge(walletAddress: Address, signedMessage: string): Promise<boolean> {
        try {
            // Calculate hash of the signed message for verification
            const messageHash = hashMessage(signedMessage)

            // Fetch the challenge from the database
            const challenge = await this.db
                .selectFrom("auth_challenges")
                .where("primary_wallet", "=", walletAddress)
                .where("message_hash", "=", messageHash)
                .where("used", "=", false)
                .where("expires_at", ">", new Date())
                .select("id")
                .executeTakeFirst()

            return !!challenge
        } catch (error) {
            console.error("Error validating challenge:", error)
            return false
        }
    }

    /**
     * Mark a challenge as used to prevent replay attacks
     * @param walletAddress The wallet address that requested the challenge
     * @param message The message that was signed
     * @returns True if the challenge was found and marked as used
     */
    async markChallengeAsUsed(walletAddress: Address, message: string): Promise<boolean> {
        try {
            // Calculate hash of the message for identification
            const messageHash = hashMessage(message)

            const result = await this.db
                .updateTable("auth_challenges")
                .set({ used: true })
                .where("primary_wallet", "=", walletAddress)
                .where("message_hash", "=", messageHash)
                .where("used", "=", false)
                .executeTakeFirst()

            return result.numUpdatedRows > 0
        } catch (error) {
            console.error("Error marking challenge as used:", error)
            return false
        }
    }

    /**
     * Clean up expired challenges for a wallet address
     * Keeps the database tidy by removing old challenges
     * @param walletAddress The wallet address to clean challenges for
     */
    private async _cleanupExpiredChallenges(walletAddress: Address): Promise<void> {
        // Keep only the most recent challenges (max 5 per wallet) to prevent database bloat
        const challengesToKeep = await this.db
            .selectFrom("auth_challenges")
            .where("primary_wallet", "=", walletAddress)
            .orderBy("created_at", "desc")
            .limit(5)
            .select("id")
            .execute()

        const idsToKeep = challengesToKeep.map((c) => c.id)

        if (idsToKeep.length > 0) {
            await this.db
                .deleteFrom("auth_challenges")
                .where("primary_wallet", "=", walletAddress)
                .where("id", "not in", idsToKeep)
                .execute()
        }

        // Also delete expired challenges
        await this.db.deleteFrom("auth_challenges").where("expires_at", "<", new Date()).execute()
    }

    /**
     * Deletes a specific session by ID
     * @param sessionId The ID of the session to delete
     * @returns True if the session was deleted, false otherwise
     */
    async deleteSession(sessionId: AuthSessionTableId): Promise<boolean> {
        try {
            // Use execute() which returns the number of affected rows
            const result = await this.db.deleteFrom("auth_sessions").where("id", "=", sessionId).execute()

            // If at least one row was affected, the deletion was successful
            return result.length > 0
        } catch (error) {
            console.error("Error deleting session:", error)
            return false
        }
    }

    /**
     * Deletes all sessions for a specific user
     * @param userId The ID of the user to delete sessions for
     * @returns True if the sessions were deleted, false otherwise
     */
    async deleteAllUserSessions(userId: UserTableId): Promise<boolean> {
        try {
            const result = await this.db.deleteFrom("auth_sessions").where("user_id", "=", userId).execute()

            return result.length > 0
        } catch (error) {
            console.error("Error deleting user sessions:", error)
            return false
        }
    }
}
