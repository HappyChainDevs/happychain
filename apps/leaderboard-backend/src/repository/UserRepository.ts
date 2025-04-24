import type { Kysely } from "kysely"
import type { Database, NewUser, User, UpdateUser } from "../db/types"

export class UserRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: number): Promise<User | undefined> {
        return await this.db.selectFrom("users").where("id", "=", id).selectAll().executeTakeFirst()
    }

    async find(criteria: Partial<User>): Promise<User[]> {
        let query = this.db.selectFrom("users")
        if (criteria.id) query = query.where("id", "=", criteria.id)
        if (criteria.happy_wallet) query = query.where("happy_wallet", "=", criteria.happy_wallet)
        if (criteria.name) query = query.where("name", "=", criteria.name)
        if (criteria.guild_id !== undefined)
            query = query.where("guild_id", criteria.guild_id === null ? "is" : "=", criteria.guild_id)
        if (criteria.created_at) query = query.where("created_at", "=", criteria.created_at)
        return await query.selectAll().execute()
    }

    async create(user: NewUser): Promise<User> {
        return await this.db.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow()
    }

    async update(id: number, updateWith: UpdateUser) {
        return await this.db.updateTable("users").set(updateWith).where("id", "=", id).executeTakeFirst()
    }

    async delete(id: number) {
        return await this.db.deleteFrom("users").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
