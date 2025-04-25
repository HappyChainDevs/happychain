import type { Address } from "@happy.tech/common"
import type { Kysely } from "kysely"
import type { Database, GuildTableId, NewUser, UpdateUser, User, UserTableId } from "../db/types"

export class UserRepository {
    constructor(private db: Kysely<Database>) {}

    /// Find a user by their numeric ID.
    async findById(id: UserTableId): Promise<User | undefined> {
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
    async findByGuildId(guild_id: GuildTableId): Promise<User[]> {
        return await this.db.selectFrom("users").where("guild_id", "=", guild_id).selectAll().execute()
    }

    /// Generic find method (for internal/admin use).
    async find(criteria: Partial<User>): Promise<User[]> {
        return await this.db
            .selectFrom("users")
            .$if(criteria.happy_wallet !== undefined, (qb) => qb.where("happy_wallet", "=", criteria.happy_wallet!))
            .$if(criteria.username !== undefined, (qb) => qb.where("username", "=", criteria.username!))
            .$if(criteria.guild_id !== undefined, (qb) =>
                criteria.guild_id === null
                    ? qb.where("guild_id", "is", null)
                    : qb.where("guild_id", "=", criteria.guild_id!),
            )
            .selectAll()
            .execute()
    }

    /// Create a new user.
    async create(user: NewUser): Promise<User> {
        // Always set guild_id to null on user creation
        const userWithNoGuild = { ...user, guild_id: null }
        return await this.db.insertInto("users").values(userWithNoGuild).returningAll().executeTakeFirstOrThrow()
    }

    /// Update a user by ID.
    async update(id: UserTableId, updateWith: UpdateUser): Promise<User | undefined> {
        await this.db.updateTable("users").set(updateWith).where("id", "=", id).executeTakeFirst()
        return this.findById(id)
    }

    /// Delete a user by ID.
    async delete(id: UserTableId): Promise<User | undefined> {
        return await this.db.deleteFrom("users").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
