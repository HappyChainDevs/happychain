import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { Database, NewUser, UpdateUser, User, UserTableId, UserWallet } from "../db/types"

export class UserRepository {
    constructor(private db: Kysely<Database>) {}

    /// Find a user by their numeric ID.
    async findById(id: UserTableId, includeWallets = false): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        const user = await this.db.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst()

        if (user && includeWallets) {
            const wallets = await this.getUserWallets(id)
            return { ...user, wallets }
        }

        return user as User & { wallets: UserWallet[] }
    }

    /// Find a user by any wallet address they own.
    async findByWalletAddress(
        walletAddress: Address,
        includeWallets = false,
    ): Promise<(User & { wallets: UserWallet[] }) | undefined> {
        // Try to find by primary wallet first
        let user = await this.db
            .selectFrom("users")
            .where("primary_wallet", "=", walletAddress)
            .selectAll()
            .executeTakeFirst()

        // If not found, check user_wallets table
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

        // If user found and we need wallets
        if (user && includeWallets) {
            const wallets = await this.getUserWallets(user.id)
            return { ...user, wallets }
        }

        return user as User & { wallets: UserWallet[] }
    }

    /// Find a user by their unique username.
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

    /// Get all wallets for a user
    async getUserWallets(userId: UserTableId): Promise<UserWallet[]> {
        return await this.db.selectFrom("user_wallets").where("user_id", "=", userId).selectAll().execute()
    }

    /// Generic find method with search criteria
    async find(criteria: {
        wallet_address?: Address
        username?: string
        includeWallets?: boolean
    }): Promise<(User & { wallets: UserWallet[] })[]> {
        const { wallet_address, username, includeWallets = false } = criteria

        // If searching by wallet, use specific method
        if (wallet_address) {
            const user = await this.findByWalletAddress(wallet_address, includeWallets)
            return user ? [user] : []
        }

        // Search by username
        if (username) {
            const users = await this.db.selectFrom("users").where("username", "=", username).selectAll().execute()

            // Add wallets if requested
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

    /// Create a new user.
    async create(user: NewUser): Promise<User> {
        // Start a transaction
        return await this.db.transaction().execute(async (trx) => {
            // Insert user record
            const createdUser = await trx.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow()

            // Add the primary wallet to the wallets table
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

    /// Update a user by ID.
    async update(id: UserTableId, updateWith: UpdateUser): Promise<User | undefined> {
        await this.db
            .updateTable("users")
            .set({
                ...updateWith,
            })
            .where("id", "=", id)
            .execute()

        return this.findById(id)
    }

    /// Add a wallet to a user.
    async addWallet(userId: UserTableId, walletAddress: Address, setAsPrimary = false): Promise<boolean> {
        // Check if wallet already exists
        const existingWallet = await this.db
            .selectFrom("user_wallets")
            .where("wallet_address", "=", walletAddress)
            .executeTakeFirst()

        if (existingWallet) {
            return false // Wallet already exists
        }

        // Start a transaction
        return await this.db.transaction().execute(async (trx) => {
            // Insert new wallet
            await trx
                .insertInto("user_wallets")
                .values({
                    user_id: userId,
                    wallet_address: walletAddress,
                    is_primary: setAsPrimary,
                })
                .execute()

            // If setting as primary, update user's primary wallet and other wallets
            if (setAsPrimary) {
                // Update the user table with the new primary wallet
                await trx
                    .updateTable("users")
                    .set({
                        primary_wallet: walletAddress,
                    })
                    .where("id", "=", userId)
                    .execute()

                // Set all other wallets to non-primary
                await trx
                    .updateTable("user_wallets")
                    .set({ is_primary: false })
                    .where("user_id", "=", userId)
                    .where("wallet_address", "!=", walletAddress)
                    .execute()
            }

            return true
        })
    }

    /// Set a wallet as primary.
    async setWalletAsPrimary(userId: UserTableId, walletAddress: Address): Promise<boolean> {
        // Check if wallet belongs to user
        const wallet = await this.db
            .selectFrom("user_wallets")
            .where("user_id", "=", userId)
            .where("wallet_address", "=", walletAddress)
            .executeTakeFirst()

        if (!wallet) {
            return false // Wallet not found for this user
        }

        // Start a transaction
        return await this.db.transaction().execute(async (trx) => {
            // Update user table with new primary wallet
            await trx
                .updateTable("users")
                .set({
                    primary_wallet: walletAddress,
                })
                .where("id", "=", userId)
                .execute()

            // Set all wallets to non-primary
            await trx.updateTable("user_wallets").set({ is_primary: false }).where("user_id", "=", userId).execute()

            // Set the target wallet as primary
            await trx
                .updateTable("user_wallets")
                .set({ is_primary: true })
                .where("user_id", "=", userId)
                .where("wallet_address", "=", walletAddress)
                .execute()

            return true
        })
    }

    /// Remove a wallet from a user.
    async removeWallet(userId: UserTableId, walletAddress: Address): Promise<boolean> {
        // Check if this is the primary wallet
        const user = await this.findById(userId)
        if (!user || user.primary_wallet === walletAddress) {
            return false // Cannot remove primary wallet
        }

        // Delete the wallet
        const result = await this.db
            .deleteFrom("user_wallets")
            .where("user_id", "=", userId)
            .where("wallet_address", "=", walletAddress)
            .execute()

        return result.length > 0
    }

    /// Delete a user by ID.
    async delete(id: UserTableId): Promise<User | undefined> {
        return await this.db.transaction().execute(async (trx) => {
            // Get user before deletion
            const user = await trx.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst()

            if (!user) {
                return undefined
            }

            // Delete all user wallets
            await trx.deleteFrom("user_wallets").where("user_id", "=", id).execute()

            // Delete user from guild memberships
            await trx.deleteFrom("guild_members").where("user_id", "=", id).execute()

            // Delete user scores
            await trx.deleteFrom("user_game_scores").where("user_id", "=", id).execute()

            // Finally delete the user
            await trx.deleteFrom("users").where("id", "=", id).execute()

            return user
        })
    }
}
