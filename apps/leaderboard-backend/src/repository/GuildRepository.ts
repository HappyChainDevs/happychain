import type { Kysely } from "kysely"
import type { Database, Guild, NewGuild, UpdateGuild } from "../db/types"

export class GuildRepository {
    constructor(private db: Kysely<Database>) {}

    async findById(id: number): Promise<Guild | undefined> {
        return await this.db.selectFrom("guilds").where("id", "=", id).selectAll().executeTakeFirst()
    }

    async find(criteria: Partial<Guild>): Promise<Guild[]> {
        let query = this.db.selectFrom("guilds")
        if (criteria.id) query = query.where("id", "=", criteria.id)
        if (criteria.name) query = query.where("name", "=", criteria.name)
        if (criteria.admin_id) query = query.where("admin_id", "=", criteria.admin_id)
        if (criteria.created_at) query = query.where("created_at", "=", criteria.created_at)
        return await query.selectAll().execute()
    }

    async create(guild: NewGuild): Promise<Guild> {
        return await this.db.insertInto("guilds").values(guild).returningAll().executeTakeFirstOrThrow()
    }

    async update(id: number, updateWith: UpdateGuild) {
        return await this.db.updateTable("guilds").set(updateWith).where("id", "=", id).executeTakeFirst()
    }

    async delete(id: number) {
        return await this.db.deleteFrom("guilds").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
