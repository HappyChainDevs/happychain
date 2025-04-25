import type { Kysely } from "kysely"
import type { Database, Guild, GuildTableId, NewGuild, UpdateGuild, UserTableId } from "../db/types"

export class GuildsRepository {
    constructor(private db: Kysely<Database>) {}

    /// Find a guild by its numeric ID.
    async findById(id: GuildTableId): Promise<Guild | undefined> {
        return await this.db.selectFrom("guilds").where("id", "=", id).selectAll().executeTakeFirst()
    }

    /// Find a guild by its unique name.
    async findByName(name: string): Promise<Guild | undefined> {
        return await this.db.selectFrom("guilds").where("name", "=", name).selectAll().executeTakeFirst()
    }

    /// Find all guilds where a user is admin.
    async findByAdminId(admin_id: UserTableId): Promise<Guild[]> {
        return await this.db.selectFrom("guilds").where("admin_id", "=", admin_id).selectAll().execute()
    }

    /// Generic find method (for internal/admin use).
    async find(criteria: Partial<Guild>): Promise<Guild[]> {
        return await this.db
            .selectFrom("guilds")
            .$if(criteria.id !== undefined, (qb) => qb.where("id", "=", criteria.id!))
            .$if(criteria.name !== undefined, (qb) => qb.where("name", "=", criteria.name!))
            .$if(criteria.admin_id !== undefined, (qb) => qb.where("admin_id", "=", criteria.admin_id!))
            .selectAll()
            .execute()
    }

    /// Create a new guild.
    async create(guild: NewGuild): Promise<Guild> {
        return await this.db.insertInto("guilds").values(guild).returningAll().executeTakeFirstOrThrow()
    }

    /// Update a guild by ID. Only updatable fields should be passed (currently only 'name').
    async update(id: GuildTableId, updateWith: UpdateGuild): Promise<Guild | undefined> {
        await this.db.updateTable("guilds").set(updateWith).where("id", "=", id).executeTakeFirst()
        return this.findById(id)
    }

    /// Delete a guild by ID.
    async delete(id: GuildTableId): Promise<Guild | undefined> {
        return await this.db.deleteFrom("guilds").where("id", "=", id).returningAll().executeTakeFirst()
    }
}
