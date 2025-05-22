import type { Context } from "hono"
import type { GuildTableId } from "../../db/types"
import { GuildRole, ResourceType } from "../roles"
import type { ActionType, RoleType } from "../roles"
import { requirePermission } from "./permissions"

/**
 * Get the user's role in a guild based on their membership status and guild relationship
 * Returns GuildRole.CREATOR, GuildRole.ADMIN, GuildRole.MEMBER, or undefined if not a member
 */
async function getGuildUserRole(c: Context): Promise<RoleType | undefined> {
    const userId = c.get("userId")
    const guild_id = c.req.param("id")
    if (!guild_id || !userId) return undefined

    const { guildRepo } = c.get("repos")
    const guildId = Number.parseInt(guild_id, 10) as GuildTableId

    // First check if user is the creator
    const guild = await guildRepo.findById(guildId)
    if (!guild) return undefined

    if (guild.creator_id === userId) {
        c.set("guildRole", GuildRole.CREATOR) // Store role in context for potential use in handlers
        return GuildRole.CREATOR
    }

    // Then check member status
    const member = await guildRepo.findGuildMember(guildId, userId)
    if (!member) return undefined

    // Store role in context for potential use in handlers
    c.set("guildRole", member.role)

    // Return the role from the member record
    return member.role
}

/**
 * Middleware factory for guild operations that combines permission checking
 * @param action The action being performed on the guild
 * @returns A middleware that checks if the user has permission to perform the action
 */
export const guildAction = (action: ActionType) => {
    return requirePermission({
        resource: ResourceType.GUILD,
        action,
        getUserRole: getGuildUserRole,
    })
}
