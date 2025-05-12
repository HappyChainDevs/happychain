import { createMiddleware } from "hono/factory"
import type { GuildTableId, UserTableId } from "../../db/types"
import type { GuildRole } from "../roles"

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

            if (role === "ADMIN" && !member.is_admin) {
                return c.json({ error: "Admin privileges required", ok: false }, 403)
            }
        }

        await next()
    })
}
