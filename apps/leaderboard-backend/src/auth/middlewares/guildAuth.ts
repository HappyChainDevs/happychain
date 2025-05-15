import type { Context } from "hono"
import { createMiddleware } from "hono/factory"
import type { GuildTableId, UserTableId } from "../../db/types"
import { GuildRole, type RoleType } from "../roles"

/**
 * Get the user's role in a guild based on their membership status and guild relationship
 * Returns GuildRole.CREATOR, GuildRole.ADMIN, GuildRole.MEMBER, or undefined if not a member
 */
export async function getGuildUserRole(c: Context): Promise<RoleType | undefined> {
    const userId = c.get("userId") as UserTableId
    const guildId = c.req.param("id")
    if (!guildId || !userId) return undefined

    const { guildRepo } = c.get("repos")
    const guildIdNum = Number.parseInt(guildId, 10) as GuildTableId

    // First check if user is the creator
    const guild = await guildRepo.findById(guildIdNum)
    if (!guild) return undefined

    if (guild.creator_id === userId) {
        return GuildRole.CREATOR
    }

    // Then check member status
    const member = await guildRepo.findGuildMember(guildIdNum, userId)
    if (!member) return undefined

    // Return the role from the member record
    return member.role
}

/**
 * Middleware that requires a specific guild role to access a route
 * @param role The minimum required role (MEMBER, ADMIN, or CREATOR)
 */
export const requireGuildRole = (role: keyof typeof GuildRole) => {
    return createMiddleware(async (c, next) => {
        const userId = c.get("userId") as UserTableId
        const guildId = c.req.param("id")
        const { guildRepo } = c.get("repos")

        const guild = await guildRepo.findById(Number(guildId) as GuildTableId)
        if (!guild) {
            return c.json({ error: "Guild not found", ok: false }, 404)
        }

        if (role === "CREATOR" && guild.creator_id !== userId) {
            return c.json({ error: "Only the guild creator can perform this action", ok: false }, 403)
        }

        if (role === "MEMBER" || role === "ADMIN") {
            const member = await guildRepo.findGuildMember(Number(guildId) as GuildTableId, userId)

            if (!member) {
                return c.json({ error: "You are not a member of this guild", ok: false }, 403)
            }

            // Check if the member's role matches the required role
            // For ADMIN, the member must have ADMIN or CREATOR role
            // For MEMBER, any role is sufficient (MEMBER, ADMIN, or CREATOR)
            if (role === "ADMIN" && member.role !== GuildRole.ADMIN && member.role !== GuildRole.CREATOR) {
                return c.json({ error: "Admin privileges required", ok: false }, 403)
            }
        }

        // Store the role in context for potential use by other middlewares
        c.set("guildRole", GuildRole[role])

        await next()
    })
}
