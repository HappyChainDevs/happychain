import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { Database, NewUser, UpdateUser, User, UserTableId, UserWallet } from "../db/types"

export class UserRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: UserTableId, includeWallets = false): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        const user = await this.db.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst()

        if (user && includeWallets) {
            const wallets = await this.getUserWallets(id)
            return { ...user, wallets }
        }

        return user as User & { wallets: UserWallet[] }
    }

    async findByWalletAddress(
        walletAddress: Address,
        includeWallets = false,
    ): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        let user = await this.db
            .selectFrom("users")
            .where("primary_wallet", "=", walletAddress)
            .selectAll()
            .executeTakeFirst()

        if (!user) {
            const walletEntry = await this.db
                .selectFrom("user_wallets")
                .where("wallet_address", "=", walletAddress)
                .selectAll()
                .executeTakeFirst()

            if (walletEntry) {
                user = await this.findById(walletEntry.user_id)
            }
        }

        if (user && includeWallets) {
            const wallets = await this.getUserWallets(user.id)
            return { ...user, wallets }
        }

        return user as User & { wallets: UserWallet[] }
    }

    async findByUsername(
        username: string,
        includeWallets = false,
    ): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        const user = await this.db.selectFrom("users").where("username", "=", username).selectAll().executeTakeFirst()

        if (user && includeWallets) {
            const wallets = await this.getUserWallets(user.id)
            return { ...user, wallets }
        }

        return user as User & { wallets: UserWallet[] }
    }

    async getUserWallets(userId: UserTableId): Promise<UserWallet[]> {
        return await this.db.selectFrom("user_wallets").where("user_id", "=", userId).selectAll().execute()
    }

    async find(criteria: {
        primary_wallet?: Address
        username?: string
        includeWallets?: boolean
    }): Promise<(User & { wallets: UserWallet[] })[]> {
        const { primary_wallet, username, includeWallets = false } = criteria

        if (primary_wallet) {
            const user = await this.findByWalletAddress(primary_wallet, includeWallets)
            return user ? [user] : []
        }

        if (username) {
            const users = await this.db.selectFrom("users").where("username", "=", username).selectAll().execute()

            if (includeWallets && users.length > 0) {
                const usersWithWallets = await Promise.all(
                    users.map(async (user) => {
                        const wallets = await this.getUserWallets(user.id)
                        return { ...user, wallets }
                    }),
                )
                return usersWithWallets
            }

            return users as (User & { wallets: UserWallet[] })[]
        }

        return []
    }

    async create(user: NewUser): Promise<User> {
        return await this.db.transaction().execute(async (trx) => {
            const createdUser = await trx.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow()

            await trx
                .insertInto("user_wallets")
                .values({
                    user_id: createdUser.id,
                    wallet_address: createdUser.primary_wallet,
                    is_primary: true,
                })
                .execute()

            return createdUser
        })
    }

    async update(id: UserTableId, updateWith: UpdateUser): Promise<User | undefined> {
        await this.db
            .updateTable("users")
            .set({
                ...updateWith,
                updated_at: new Date().toISOString(),
            })
            .where("id", "=", id)
            .execute()

        return this.findById(id)
    }

    async addWallet(userId: UserTableId, walletAddress: Address): Promise<boolean> {
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
            })
            .execute()
        return true
    }

    async setWalletAsPrimary(userId: UserTableId, walletAddress: Address): Promise<boolean> {
        const wallet = await this.db
            .selectFrom("user_wallets")
            .where("user_id", "=", userId)
            .where("wallet_address", "=", walletAddress)
            .executeTakeFirst()

        if (!wallet) {
            return false
        }

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
    }

    async removeWallet(userId: UserTableId, walletAddress: Address): Promise<boolean> {
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
    }

    async delete(id: UserTableId): Promise<User | undefined> {
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
    }
}
