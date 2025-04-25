import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { Database, NewUser, UpdateUser, User } from "../db/types"

export class UserRepository {
    constructor(private db: Kysely<Database>) {}

    /// Find a user by their numeric ID.
    async findById(id: number): Promise<User | undefined> {
        return await this.db.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst()
    }

    /// Find a user by their unique happy_wallet address.
    async findByHappyWallet(happy_wallet: Address): Promise<User | undefined> {
        return await this.db.selectFrom("users").where("happy_wallet", "=", happy_wallet).selectAll().executeTakeFirst()
    }

    /// Find a user by their unique username.
    async findByUsername(username: string): Promise<User | undefined> {
        return await this.db.selectFrom("users").where("username", "=", username).selectAll().executeTakeFirst()
    }

    /// Find all users in a given guild (by guild_id).
    async findByGuildId(guild_id: number): Promise<User[]> {
        return await this.db.selectFrom("users").where("guild_id", "=", guild_id).selectAll().execute()
    }

    /// Generic find method (for internal/admin use).
    async find(criteria: Partial<User>): Promise<User[]> {
        let query = this.db.selectFrom("users")
        if (criteria.id) query = query.where("id", "=", criteria.id)
        if (criteria.happy_wallet) query = query.where("happy_wallet", "=", criteria.happy_wallet)
        if (criteria.username) query = query.where("username", "=", criteria.username)
        if (criteria.guild_id !== undefined)
            query = query.where("guild_id", criteria.guild_id === null ? "is" : "=", criteria.guild_id)
        if (criteria.created_at) query = query.where("created_at", "=", criteria.created_at)
        return await query.selectAll().execute()
    }

    /// Create a new user.
    async create(user: NewUser): Promise<User> {
        return await this.db.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow()
    }

    /// Update a user by ID.
    async update(id: number, updateWith: UpdateUser): Promise<User | undefined> {
        await this.db.updateTable("users").set(updateWith).where("id", "=", id).executeTakeFirst()
        return this.findById(id)
    }

    /// Delete a user by ID.
    async delete(id: number): Promise<User | undefined> {
        return await this.db.deleteFrom("users").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
