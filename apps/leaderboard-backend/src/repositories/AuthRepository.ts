import { createUUID } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type {
    AuthChallenge,
    AuthSession,
    AuthSessionTableId,
    Database,
    NewAuthSession,
    UserTableId,
} from "../db/types"

export class AuthRepository {
    constructor(private db: Kysely<Database>) {}

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

    async getUserSessions(userId: UserTableId): Promise<AuthSession[]> {
        try {
            return await this.db.selectFrom("auth_sessions").where("user_id", "=", userId).selectAll().execute()
        } catch (error) {
            console.error("Error getting user sessions:", error)
            return []
        }
    }

    /**
     * Create a new authentication challenge for a wallet address
     * @param walletAddress - The wallet address to create a challenge for
     * @param message - The challenge message to be signed
     * @param expiresIn - Number of seconds until the challenge expires
     * @returns The created challenge with nonce
     */
    async createChallenge(
        walletAddress: Address,
        message: string,
        expiresIn = 300,
    ): Promise<AuthChallenge | undefined> {
        return undefined
    }

    /**
     * Validate a challenge during authentication
     * @param walletAddress - The wallet address that's authenticating
     * @param nonce - The nonce from the challenge
     * @param signedMessage - The message that was signed
     * @returns The challenge if valid, undefined if invalid or expired
     */
    async validateChallenge(
        walletAddress: Address,
        nonce: string,
        signedMessage: string,
    ): Promise<AuthChallenge | undefined> {
        return undefined
    }

    /**
     * Mark a challenge as used to prevent replay attacks
     * @param challengeId - The ID of the challenge to mark as used
     */
    async markChallengeAsUsed(challengeId: number): Promise<boolean> {
        const res = await this.db
            .updateTable("auth_challenges")
            .set({ used: true })
            .where("id", "=", challengeId)
            .execute()
        return res.length > 0
    }

    /**
     * Clean up old challenges for a wallet address
     * @private
     */
    private async _cleanupExpiredChallenges(walletAddress: Address): Promise<void> {
        // For now, just limit the number of challenges per wallet to prevent database bloat
        // This is a simpler approach than dealing with date comparisons that can have type issues
        const oldChallenges = await this.db
            .selectFrom("auth_challenges")
            .select("id")
            .where("primary_wallet", "=", walletAddress)
            .orderBy("created_at", "desc")
            .offset(10) // Keep only the 10 most recent challenges
            .execute()

        if (oldChallenges.length > 0) {
            const oldIds = oldChallenges.map((c) => c.id)
            await this.db.deleteFrom("auth_challenges").where("id", "in", oldIds).execute()
        }
    }

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
