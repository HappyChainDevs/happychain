import { createMiddleware } from "hono/factory"
import type { GameTableId, UserTableId } from "../../db/types"

export const requireGameOwnership = createMiddleware(async (c, next) => {
    const userId = c.get("userId") as UserTableId
    const gameId = c.req.param("id")
    const { gameRepo } = c.get("repos")

    const game = await gameRepo.findById(Number(gameId) as GameTableId)

    if (!game) {
        return c.json({ error: "Game not found", ok: false }, 404)
    }

    if (game.admin_id !== userId) {
        return c.json({ error: "Only the game creator can perform this action", ok: false }, 403)
    }

    await next()
})
