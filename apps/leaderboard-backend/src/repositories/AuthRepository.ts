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
            const session = await this.db
                .selectFrom("auth_sessions")
                .where("id", "=", sessionId)
                .selectAll()
                .executeTakeFirst()

            if (!session) {
                return undefined
            }

            await this.db
                .updateTable("auth_sessions")
                .set({ last_used_at: new Date().toISOString() })
                .where("id", "=", sessionId)
                .executeTakeFirstOrThrow()

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

    async deleteSession(sessionId: AuthSessionTableId): Promise<boolean> {
        try {
            await this.db.deleteFrom("auth_sessions").where("id", "=", sessionId).executeTakeFirstOrThrow()

            return true
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
