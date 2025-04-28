import { z } from "@hono/zod-openapi"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import type { GameTableId } from "../../db/types"
import type { Repositories } from "../../repositories"

const leaderboardApi = new Hono()

// Validation schemas for query parameters
const limitQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
})

const gameIdParamSchema = z.object({
    id: z.coerce
        .number()
        .int()
        .positive()
        .transform((id) => id as GameTableId),
})

// GET /leaderboards/global - Global leaderboard (top users across all games)
leaderboardApi.get("/global", zValidator("query", limitQuerySchema), async (c) => {
    try {
        const { limit } = c.req.valid("query")
        const { leaderboardRepo } = c.get("repos") as Repositories

        const leaderboard = await leaderboardRepo.getGlobalLeaderboard(limit)
        return c.json({
            ok: true,
            data: leaderboard,
        })
    } catch (err) {
        console.error("Error fetching global leaderboard:", err)
        return c.json({ ok: false, error: "Internal Server Error" }, 500)
    }
})

// GET /leaderboards/guilds - Guild leaderboard (top guilds)
leaderboardApi.get("/guilds", zValidator("query", limitQuerySchema), async (c) => {
    try {
        const { limit } = c.req.valid("query")
        const { leaderboardRepo } = c.get("repos") as Repositories

        const leaderboard = await leaderboardRepo.getGuildLeaderboard(limit)
        return c.json({
            ok: true,
            data: leaderboard,
        })
    } catch (err) {
        console.error("Error fetching guild leaderboard:", err)
        return c.json({ ok: false, error: "Internal Server Error" }, 500)
    }
})

// GET /leaderboards/games/:id - Game-specific leaderboard (top users in a game)
leaderboardApi.get(
    "/games/:id",
    zValidator("param", gameIdParamSchema),
    zValidator("query", limitQuerySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { limit } = c.req.valid("query")
            const { leaderboardRepo } = c.get("repos") as Repositories

            const leaderboard = await leaderboardRepo.getGameLeaderboard(id, limit)
            return c.json({
                ok: true,
                data: leaderboard,
            })
        } catch (err) {
            console.error(`Error fetching leaderboard for game ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    },
)

// GET /leaderboards/games/:id/guilds - Game-specific guild leaderboard
leaderboardApi.get(
    "/games/:id/guilds",
    zValidator("param", gameIdParamSchema),
    zValidator("query", limitQuerySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { limit } = c.req.valid("query")
            const { leaderboardRepo } = c.get("repos") as Repositories

            const leaderboard = await leaderboardRepo.getGameGuildLeaderboard(id, limit)
            return c.json({
                ok: true,
                data: leaderboard,
            })
        } catch (err) {
            console.error(`Error fetching guild leaderboard for game ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    },
)

export { leaderboardApi }
