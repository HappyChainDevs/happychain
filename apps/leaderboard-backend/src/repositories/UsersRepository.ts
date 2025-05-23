import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { Database, NewUser, UpdateUser, User, UserTableId, UserWallet } from "../db/types"

export class UserRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: UserTableId, includeWallets = false): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        try {
            const user = await this.db.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirstOrThrow()

            if (includeWallets) {
                const wallets = await this.getUserWallets(id)
                return { ...user, wallets }
            }

            return user as User & { wallets: UserWallet[] }
        } catch (error) {
            console.error("Error finding user by ID:", error)
            return undefined
        }
    }

    async findByWalletAddress(
        walletAddress: Address,
        includeWallets = false,
    ): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        try {
            if (!includeWallets) {
                // Simple query without wallets
                const user = await this.db
                    .selectFrom("users")
                    .where("primary_wallet", "=", walletAddress)
                    .selectAll()
                    .executeTakeFirst()

                return user ? { ...user, wallets: [] } : undefined
            }

            // Query with wallets using a join
            const results = await this.db
                .selectFrom("users")
                .leftJoin("user_wallets", "users.id", "user_wallets.user_id")
                .where("users.primary_wallet", "=", walletAddress)
                .select([
                    "users.id",
                    "users.primary_wallet",
                    "users.username",
                    "users.created_at",
                    "users.updated_at",
                    "user_wallets.id as wallet_id",
                    "user_wallets.wallet_address",
                    "user_wallets.is_primary",
                    "user_wallets.created_at as wallet_created_at",
                ])
                .execute()

            if (results.length === 0) {
                return undefined
            }

            // Process the joined results to form the user with wallets
            const userData = {
                id: results[0].id,
                primary_wallet: results[0].primary_wallet,
                username: results[0].username,
                created_at: results[0].created_at,
                updated_at: results[0].updated_at,
                wallets: results
                    .filter((row) => row.wallet_id !== null)
                    .map((row) => ({
                        id: row.wallet_id,
                        user_id: results[0].id,
                        wallet_address: row.wallet_address,
                        is_primary: row.is_primary,
                        created_at: row.wallet_created_at,
                    })),
            }

            return userData as User & { wallets: UserWallet[] }
        } catch (error) {
            console.error("Error finding user by wallet address:", error)
            return undefined
        }
    }

    async findByUsername(
        username: string,
        includeWallets = false,
    ): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        try {
            const user = await this.db
                .selectFrom("users")
                .where("username", "=", username)
                .selectAll()
                .executeTakeFirstOrThrow()

            if (includeWallets) {
                const wallets = await this.getUserWallets(user.id)
                return { ...user, wallets }
            }

            return user as User & { wallets: UserWallet[] }
        } catch (error) {
            console.error("Error finding user by username:", error)
            return undefined
        }
    }

    async getUserWallets(userId: UserTableId): Promise<UserWallet[]> {
        try {
            return await this.db.selectFrom("user_wallets").where("user_id", "=", userId).selectAll().execute()
        } catch (error) {
            console.error("Error getting user wallets:", error)
            return []
        }
    }

    async find(criteria: {
        primary_wallet?: Address
        username?: string
        includeWallets?: boolean
    }): Promise<(User & { wallets: UserWallet[] })[]> {
        try {
            const { primary_wallet, username, includeWallets = false } = criteria

            if (primary_wallet) {
                const user = await this.findByWalletAddress(primary_wallet, includeWallets)
                return user ? [user] : []
            }

            if (username) {
                const user = await this.db
                    .selectFrom("users")
                    .where("username", "=", username)
                    .selectAll()
                    .executeTakeFirstOrThrow()

                if (includeWallets) {
                    const wallets = await this.getUserWallets(user.id)
                    return [{ ...user, wallets }]
                }

                return [user as User & { wallets: UserWallet[] }]
            }

            return []
        } catch (error) {
            console.error("Error finding users by criteria:", error)
            return []
        }
    }

    async create(user: NewUser): Promise<User | undefined> {
        try {
            const now = new Date().toISOString()
            return await this.db.transaction().execute(async (trx) => {
                const createdUser = await trx
                    .insertInto("users")
                    .values({
                        ...user,
                        created_at: now,
                        updated_at: now,
                    })
                    .returningAll()
                    .executeTakeFirstOrThrow()

                await trx
                    .insertInto("user_wallets")
                    .values({
                        user_id: createdUser.id,
                        wallet_address: createdUser.primary_wallet,
                        is_primary: true,
                        created_at: now,
                    })
                    .execute()

                return createdUser
            })
        } catch (error) {
            console.error("Error creating user:", error)
            return undefined
        }
    }

    async update(id: UserTableId, updateWith: UpdateUser): Promise<User | undefined> {
        try {
            await this.db
                .updateTable("users")
                .set({
                    ...updateWith,
                    updated_at: new Date().toISOString(),
                })
                .where("id", "=", id)
                .execute()

            return this.findById(id)
        } catch (error) {
            console.error("Error updating user:", error)
            return undefined
        }
    }

    async addWallet(userId: UserTableId, walletAddress: Address): Promise<boolean> {
        try {
            // Check if wallet already exists for any user
            const existingWallet = await this.db
                .selectFrom("user_wallets")
                .select("id")
                .where("wallet_address", "=", walletAddress)
                .executeTakeFirst()
            if (existingWallet) {
                return false
            }
            // Insert as secondary wallet
            await this.db
                .insertInto("user_wallets")
                .values({
                    user_id: userId,
                    wallet_address: walletAddress,
                    is_primary: false,
                    created_at: new Date().toISOString(),
                })
                .execute()

            return true
        } catch (error) {
            console.error("Error adding wallet:", error)
            return false
        }
    }

    async setWalletAsPrimary(userId: UserTableId, walletAddress: Address): Promise<boolean> {
        try {
            // Make sure the wallet exists first
            await this.db
                .selectFrom("user_wallets")
                .where("user_id", "=", userId)
                .where("wallet_address", "=", walletAddress)
                .executeTakeFirstOrThrow()

            return await this.db.transaction().execute(async (trx) => {
                await trx
                    .updateTable("users")
                    .set({
                        primary_wallet: walletAddress,
                        updated_at: new Date().toISOString(),
                    })
                    .where("id", "=", userId)
                    .execute()

                await trx.updateTable("user_wallets").set({ is_primary: false }).where("user_id", "=", userId).execute()

                await trx
                    .updateTable("user_wallets")
                    .set({ is_primary: true })
                    .where("user_id", "=", userId)
                    .where("wallet_address", "=", walletAddress)
                    .execute()

                return true
            })
        } catch (error) {
            console.error("Error setting wallet as primary:", error)
            return false
        }
    }

    async removeWallet(userId: UserTableId, walletAddress: Address): Promise<boolean> {
        try {
            const user = await this.findById(userId)
            if (!user || user.primary_wallet === walletAddress) {
                return false
            }

            const result = await this.db
                .deleteFrom("user_wallets")
                .where("user_id", "=", userId)
                .where("wallet_address", "=", walletAddress)
                .execute()

            return result.length > 0
        } catch (error) {
            console.error("Error removing wallet:", error)
            return false
        }
    }

    async delete(id: UserTableId): Promise<User | undefined> {
        try {
            return await this.db.transaction().execute(async (trx) => {
                const user = await trx.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst()

                if (!user) {
                    return undefined
                }

                await trx.deleteFrom("user_wallets").where("user_id", "=", id).execute()
                await trx.deleteFrom("guild_members").where("user_id", "=", id).execute()
                await trx.deleteFrom("user_game_scores").where("user_id", "=", id).execute()
                await trx.deleteFrom("users").where("id", "=", id).execute()

                return user
            })
        } catch (error) {
            console.error("Error deleting user:", error)
            return undefined
        }
    }
}
