import type { Kysely } from "kysely"
import { GuildRole } from "../auth/roles"
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

    async findById(
        id: GuildTableId,
        includeMembers = false,
    ): Promise<(Guild & { members: GuildMember[] }) | undefined> {
        try {
            const guild = await this.db.selectFrom("guilds").where("id", "=", id).selectAll().executeTakeFirstOrThrow()

            if (includeMembers) {
                const members = await this.getGuildMembersWithUserDetails(id)
                return { ...guild, members }
            }

            return guild as Guild & { members: GuildMember[] }
        } catch (error) {
            console.error("Error finding guild by ID:", error)
            return undefined
        }
    }

    async findByName(name: string, includeMembers = false): Promise<(Guild & { members: GuildMember[] })[]> {
        try {
            const guilds = await this.db.selectFrom("guilds").where("name", "like", `%${name}%`).selectAll().execute()
            if (guilds.length === 0) {
                return []
            }

            if (includeMembers) {
                const guildsWithMembers = await Promise.all(
                    guilds.map(async (guild) => {
                        const members = await this.getGuildMembersWithUserDetails(guild.id)
                        return { ...guild, members }
                    }),
                )
                return guildsWithMembers
            }

            return guilds as (Guild & { members: GuildMember[] })[]
        } catch (error) {
            console.error("Error finding guilds by name:", error)
            return []
        }
    }

    async findByCreator(
        creatorId: UserTableId,
        includeMembers = false,
    ): Promise<(Guild & { members: GuildMember[] })[]> {
        try {
            const guilds = await this.db.selectFrom("guilds").where("creator_id", "=", creatorId).selectAll().execute()
            if (guilds.length === 0) {
                return []
            }

            if (includeMembers) {
                const guildsWithMembers = await Promise.all(
                    guilds.map(async (guild) => {
                        const members = await this.getGuildMembersWithUserDetails(guild.id)
                        return { ...guild, members }
                    }),
                )
                return guildsWithMembers
            }

            return guilds as (Guild & { members: GuildMember[] })[]
        } catch (error) {
            console.error("Error finding guilds by creator:", error)
            return []
        }
    }

    async find(criteria: {
        name?: string
        creator_id?: UserTableId
        includeMembers?: boolean
    }): Promise<(Guild & { members: GuildMember[] })[]> {
        try {
            const { name, creator_id, includeMembers = false } = criteria

            const guilds = await this.db
                .selectFrom("guilds")
                .$if(typeof name === "string" && name.length > 0, (qb) => qb.where("name", "like", `%${name}%`))
                .$if(typeof creator_id === "number", (qb) => qb.where("creator_id", "=", creator_id as UserTableId))
                .selectAll()
                .execute()

            if (guilds.length === 0) {
                return []
            }

            if (includeMembers) {
                const guildsWithMembers = await Promise.all(
                    guilds.map(async (guild) => {
                        const members = await this.getGuildMembersWithUserDetails(guild.id)
                        return { ...guild, members }
                    }),
                )
                return guildsWithMembers
            }

            return guilds as (Guild & { members: GuildMember[] })[]
        } catch (error) {
            console.error("Error finding guilds by criteria:", error)
            return []
        }
    }

    async create(guild: NewGuild): Promise<Guild | undefined> {
        try {
            const now = new Date().toISOString()
            return await this.db.transaction().execute(async (trx) => {
                const newGuild = await trx
                    .insertInto("guilds")
                    .values({
                        ...guild,
                        created_at: now,
                        updated_at: now,
                    })
                    .returningAll()
                    .executeTakeFirstOrThrow()

                await trx
                    .insertInto("guild_members")
                    .values({
                        guild_id: newGuild.id,
                        user_id: newGuild.creator_id,
                        role: GuildRole.CREATOR,
                        joined_at: now,
                    })
                    .execute()

                return newGuild
            })
        } catch (error) {
            console.error("Error creating guild:", error)
            return undefined
        }
    }

    async update(id: GuildTableId, updateWith: UpdateGuild): Promise<Guild | undefined> {
        try {
            await this.db
                .updateTable("guilds")
                .set({
                    ...updateWith,
                    updated_at: new Date().toISOString(),
                })
                .where("id", "=", id)
                .executeTakeFirstOrThrow()

            return this.findById(id)
        } catch (error) {
            console.error("Error updating guild:", error)
            return undefined
        }
    }

    async delete(id: GuildTableId): Promise<Guild | undefined> {
        try {
            return await this.db.transaction().execute(async (trx) => {
                const guild = await trx.selectFrom("guilds").where("id", "=", id).selectAll().executeTakeFirstOrThrow()

                await trx.deleteFrom("guild_members").where("guild_id", "=", id).execute()
                await trx.deleteFrom("guilds").where("id", "=", id).execute()

                return guild
            })
        } catch (error) {
            console.error("Error deleting guild:", error)
            return undefined
        }
    }

    async getGuildMembersWithUserDetails(guildId: GuildTableId): Promise<GuildMemberWithUser[]> {
        try {
            return await this.db
                .selectFrom("guild_members")
                .innerJoin("users", "users.id", "guild_members.user_id")
                .where("guild_members.guild_id", "=", guildId)
                .select([
                    "guild_members.id",
                    "guild_members.guild_id",
                    "guild_members.user_id",
                    "guild_members.role",
                    "guild_members.joined_at",
                    "users.username",
                    "users.primary_wallet",
                ])
                .execute()
        } catch (error) {
            console.error("Error getting guild members with user details:", error)
            return []
        }
    }

    async getUserGuilds(userId: UserTableId): Promise<Guild[]> {
        try {
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
                    "guilds.updated_at",
                ])
                .execute()
        } catch (error) {
            console.error("Error getting user guilds:", error)
            return []
        }
    }

    async findGuildMember(guildId: GuildTableId, userId: UserTableId): Promise<GuildMember | undefined> {
        try {
            return await this.db
                .selectFrom("guild_members")
                .where("guild_id", "=", guildId)
                .where("user_id", "=", userId)
                .selectAll()
                .executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error finding guild member:", error)
            return undefined
        }
    }

    async addMember(guildId: GuildTableId, userId: UserTableId, isAdmin = false): Promise<GuildMember | undefined> {
        try {
            const existing = await this.db
                .selectFrom("guild_members")
                .where("guild_id", "=", guildId)
                .where("user_id", "=", userId)
                .select(["id"])
                .executeTakeFirst()

            if (existing) {
                return undefined
            }

            // Determine role based on isAdmin parameter
            const role = isAdmin ? GuildRole.ADMIN : GuildRole.MEMBER

            await this.db
                .insertInto("guild_members")
                .values({
                    guild_id: guildId,
                    user_id: userId,
                    role: role,
                    joined_at: new Date().toISOString(),
                })
                .execute()

            return await this.db
                .selectFrom("guild_members")
                .where("guild_id", "=", guildId)
                .where("user_id", "=", userId)
                .select(["id", "guild_id", "user_id", "role", "joined_at"])
                .executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error adding member to guild:", error)
            return undefined
        }
    }

    async updateMemberRole(
        guildId: GuildTableId,
        userId: UserTableId,
        role: GuildRole,
    ): Promise<GuildMember | undefined> {
        try {
            // Ensure we're not changing a creator's role
            const member = await this.findGuildMember(guildId, userId)
            if (!member) {
                throw new Error("Member not found in guild")
            }

            // Don't allow changing the role of the creator
            if (member.role === GuildRole.CREATOR) {
                throw new Error("Cannot change the role of the guild creator")
            }

            // Only allow setting valid non-creator roles
            if (role !== GuildRole.ADMIN && role !== GuildRole.MEMBER) {
                throw new Error("Invalid role specified")
            }

            return await this.db
                .updateTable("guild_members")
                .set({ role })
                .where("guild_id", "=", guildId)
                .where("user_id", "=", userId)
                .returningAll()
                .executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error updating member role:", error)
            return undefined
        }
    }

    async removeMember(guildId: GuildTableId, userId: UserTableId): Promise<GuildMember | undefined> {
        try {
            const guild = await this.findById(guildId)
            if (!guild) {
                return undefined
            }

            if (guild.creator_id === userId) {
                return undefined
            }

            return await this.db
                .deleteFrom("guild_members")
                .where("guild_id", "=", guildId)
                .where("user_id", "=", userId)
                .returningAll()
                .executeTakeFirstOrThrow()
        } catch (error) {
            console.error("Error removing member from guild:", error)
            return undefined
        }
    }
}
