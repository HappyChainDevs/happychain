import { createUUID } from "@happy.tech/common"
import type { Address, Hex } from "@happy.tech/common"
import { abis, deployment } from "@happy.tech/contracts/boop/anvil"

import type { Kysely } from "kysely"
import { http, createPublicClient, hashMessage } from "viem"
import { localhost } from "viem/chains"

import type { AuthSession, AuthSessionTableId, Database, NewAuthSession, UserTableId } from "../db/types"
import { env } from "../env"

const EIP1271_MAGIC_VALUE = "0x1626ba7e"

export class AuthRepository {
    private publicClient: ReturnType<typeof createPublicClient>

    constructor(private db: Kysely<Database>) {
        this.publicClient = createPublicClient({
            chain: localhost,
            transport: http(env.RPC_URL),
        })
    }

    async generateChallenge(primary_wallet: Address): Promise<string> {
        const nonce = await this.publicClient.readContract({
            address: deployment.EntryPoint,
            abi: abis.EntryPoint,
            functionName: "nonceValues",
            args: [primary_wallet, 0n],
        })

        const timestamp = Date.now()

        return `${nonce}${timestamp}`
    }

    async verifySignature(primary_wallet: Address, message: Hex, signature: Hex): Promise<boolean> {
        try {
            const messageHash = await hashMessage({ raw: message })
            const result = await this.publicClient.readContract({
                address: primary_wallet,
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

            this.db.insertInto("auth_sessions").values(newSession).executeTakeFirst()

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

            const now = new Date().toISOString()
            await this.db.updateTable("auth_sessions").set({ last_used_at: now }).where("id", "=", sessionId).execute()

            return session
        } catch (error) {
            console.error("Error verifying session:", error)
            return undefined
        }
    }

    async getUserSessions(userId: UserTableId): Promise<AuthSession[]> {
        return this.db.selectFrom("auth_sessions").where("user_id", "=", userId).selectAll().execute()
    }

    async deleteSession(sessionId: AuthSessionTableId): Promise<boolean> {
        try {
            const res = await this.db.deleteFrom("auth_sessions").where("id", "=", sessionId).executeTakeFirstOrThrow()

            return res.numDeletedRows > 0n
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
