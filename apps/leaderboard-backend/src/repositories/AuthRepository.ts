import { createUUID } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { AuthSession, AuthSessionTableId, Database, NewAuthSession, UserTableId } from "../db/types"

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
            // First check if the session exists and belongs to an existing user
            const session = await this.db
                .selectFrom("auth_sessions")
                .innerJoin("users", "users.id", "auth_sessions.user_id")
                .where("auth_sessions.id", "=", sessionId)
                .select([
                    "auth_sessions.id",
                    "auth_sessions.user_id",
                    "auth_sessions.primary_wallet",
                    "auth_sessions.created_at",
                    "auth_sessions.last_used_at",
                ])
                .executeTakeFirst()

            if (!session) {
                return undefined
            }

            // Update the last_used_at timestamp
            const currentTime = new Date().toISOString()

            // We don't need the result of this update since we already have the session data
            // and the only thing that changed is the last_used_at timestamp, which isn't usually
            // needed by the application logic
            await this.db
                .updateTable("auth_sessions")
                .set({ last_used_at: currentTime })
                .where("id", "=", sessionId)
                .executeTakeFirstOrThrow()

            // Return the session with the updated timestamp
            // The session object already has the correct types from the database schema
            // so we need to preserve those types
            return {
                ...session,
                last_used_at: new Date(currentTime), // Convert string to Date to match expected type
            }
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
