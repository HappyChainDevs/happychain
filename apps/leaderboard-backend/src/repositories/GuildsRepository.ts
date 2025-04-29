import type { Kysely } from "kysely"
import type {
    Database,
    Guild,
    GuildMember,
    GuildMemberWithUser,
    GuildTableId,
    NewGuild,
    UpdateGuild,
    UserTableId,
} from "../db/types"

export class GuildRepository {
    constructor(private db: Kysely<Database>) {}

    /// Find a guild by ID
    async findById(
        id: GuildTableId,
        includeMembers = false,
    ): Promise<(Guild & { members: GuildMember[] }) | undefined> {
        const guild = await this.db.selectFrom("guilds").where("id", "=", id).selectAll().executeTakeFirst()

        if (guild && includeMembers) {
            const members = await this.getGuildMembersWithUserDetails(id)
            return { ...guild, members }
        }

        return guild as Guild & { members: GuildMember[] }
    }

    /// Find guilds by name (partial match)
    async findByName(name: string, includeMembers = false): Promise<(Guild & { members: GuildMember[] })[]> {
        const guilds = await this.db.selectFrom("guilds").where("name", "like", `%${name}%`).selectAll().execute()

        if (includeMembers && guilds.length > 0) {
            const guildsWithMembers = await Promise.all(
                guilds.map(async (guild) => {
                    const members = await this.getGuildMembersWithUserDetails(guild.id)
                    return { ...guild, members }
                }),
            )
            return guildsWithMembers
        }

        return guilds as (Guild & { members: GuildMember[] })[]
    }

    /// Find guilds by creator
    async findByCreator(
        creatorId: UserTableId,
        includeMembers = false,
    ): Promise<(Guild & { members: GuildMember[] })[]> {
        const guilds = await this.db.selectFrom("guilds").where("creator_id", "=", creatorId).selectAll().execute()

        if (includeMembers && guilds.length > 0) {
            const guildsWithMembers = await Promise.all(
                guilds.map(async (guild) => {
                    const members = await this.getGuildMembersWithUserDetails(guild.id)
                    return { ...guild, members }
                }),
            )
            return guildsWithMembers
        }

        return guilds as (Guild & { members: GuildMember[] })[]
    }

    /// Generic find method with search criteria
    async find(criteria: {
        name?: string
        creator_id?: UserTableId
        includeMembers?: boolean
    }): Promise<(Guild & { members: GuildMember[] })[]> {
        const { name, creator_id, includeMembers = false } = criteria

        const guilds = await this.db
            .selectFrom("guilds")
            .$if(typeof name === "string" && name.length > 0, (qb) => qb.where("name", "like", `%${name}%`))
            .$if(typeof creator_id === "number", (qb) => qb.where("creator_id", "=", creator_id as UserTableId))
            .selectAll()
            .execute()

        if (includeMembers && guilds.length > 0) {
            const guildsWithMembers = await Promise.all(
                guilds.map(async (guild) => {
                    const members = await this.getGuildMembersWithUserDetails(guild.id)
                    return { ...guild, members }
                }),
            )
            return guildsWithMembers
        }

        return guilds as (Guild & { members: GuildMember[] })[]
    }

    /// Create a new guild
    async create(guild: NewGuild): Promise<Guild> {
        return await this.db.transaction().execute(async (trx) => {
            // Create the guild
            const newGuild = await trx.insertInto("guilds").values(guild).returningAll().executeTakeFirstOrThrow()

            // Add creator as admin member
            await trx
                .insertInto("guild_members")
                .values({
                    guild_id: newGuild.id,
                    user_id: newGuild.creator_id,
                    is_admin: true,
                })
                .execute()

            return newGuild
        })
    }

    /// Update guild details
    async update(id: GuildTableId, updateWith: UpdateGuild): Promise<Guild | undefined> {
        await this.db.updateTable("guilds").set(updateWith).where("id", "=", id).execute()

        return this.findById(id)
    }

    /// Delete a guild
    async delete(id: GuildTableId): Promise<Guild | undefined> {
        return await this.db.transaction().execute(async (trx) => {
            // Get guild before deletion
            const guild = await trx.selectFrom("guilds").where("id", "=", id).selectAll().executeTakeFirst()

            if (!guild) {
                return undefined
            }

            // Delete all guild members
            await trx.deleteFrom("guild_members").where("guild_id", "=", id).execute()

            // Delete the guild
            await trx.deleteFrom("guilds").where("id", "=", id).execute()

            return guild
        })
    }

    /// Get guild members with user details
    async getGuildMembersWithUserDetails(guildId: GuildTableId): Promise<GuildMemberWithUser[]> {
        return await this.db
            .selectFrom("guild_members")
            .innerJoin("users", "users.id", "guild_members.user_id")
            .where("guild_members.guild_id", "=", guildId)
            .select([
                "guild_members.id",
                "guild_members.guild_id",
                "guild_members.user_id",
                "guild_members.is_admin",
                "guild_members.joined_at",
                "users.username",
                "users.primary_wallet",
            ])
            .execute()
    }

    /// Get guilds a user belongs to
    async getUserGuilds(userId: UserTableId) {
        return await this.db
            .selectFrom("guild_members")
            .innerJoin("guilds", "guilds.id", "guild_members.guild_id")
            .where("guild_members.user_id", "=", userId)
            .select([
                "guilds.id",
                "guilds.name",
                "guilds.icon_url",
                "guilds.creator_id",
                "guilds.created_at",
                "guild_members.is_admin",
                "guild_members.joined_at",
            ])
            .execute()
    }

    /// Check if user is an admin of a guild
    async isUserGuildAdmin(userId: UserTableId, guildId: GuildTableId) {
        const member = await this.db
            .selectFrom("guild_members")
            .where("guild_id", "=", guildId)
            .where("user_id", "=", userId)
            .where("is_admin", "=", true)
            .selectAll()
            .executeTakeFirst()

        return !!member
    }

    /// Add member to guild
    async addMember(guildId: GuildTableId, userId: UserTableId, isAdmin = false) {
        // Check if membership already exists
        const existing = await this.db
            .selectFrom("guild_members")
            .where("guild_id", "=", guildId)
            .where("user_id", "=", userId)
            .select(["id"]) // only need id to check existence
            .executeTakeFirst()

        if (existing) {
            return null // Already a member
        }

        // Add new member (simple insert)
        await this.db
            .insertInto("guild_members")
            .values({
                guild_id: guildId,
                user_id: userId,
                is_admin: isAdmin,
            })
            .execute()

        // Explicitly select only the columns needed
        return await this.db
            .selectFrom("guild_members")
            .where("guild_id", "=", guildId)
            .where("user_id", "=", userId)
            .select(["id", "guild_id", "user_id", "is_admin", "joined_at"]) // be explicit
            .executeTakeFirst()
    }

    /// Update member role
    async updateMemberRole(guildId: GuildTableId, userId: UserTableId, isAdmin: boolean) {
        return await this.db
            .updateTable("guild_members")
            .set({ is_admin: isAdmin })
            .where("guild_id", "=", guildId)
            .where("user_id", "=", userId)
            .returningAll()
            .executeTakeFirst()
    }

    /// Remove member from guild
    async removeMember(guildId: GuildTableId, userId: UserTableId) {
        // Check if this is the creator/last admin
        const guild = await this.findById(guildId)
        if (!guild) {
            return null
        }

        // Don't allow removing the guild creator
        if (guild.creator_id === userId) {
            return null
        }

        // Remove the member
        return await this.db
            .deleteFrom("guild_members")
            .where("guild_id", "=", guildId)
            .where("user_id", "=", userId)
            .returningAll()
            .executeTakeFirst()
    }
}
