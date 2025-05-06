import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import {
    LeaderboardGameIdParamSchema,
    LeaderboardLimitQuerySchema,
} from "../../validation/leaderboard/leaderBoardSchema"

export default new Hono()

    /**
     * GET /leaderboards/global - Global leaderboard (top users across all games)
     * Returns users ranked by their total score across all games
     */
    .get("/global", zValidator("query", LeaderboardLimitQuerySchema), async (c) => {
        try {
            const { limit } = c.req.valid("query")
            const { leaderboardRepo } = c.get("repos")

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

    /**
     * GET /leaderboards/guilds - Guild leaderboard (top guilds)
     * Returns guilds ranked by their members' total score across all games
     */
    .get("/guilds", zValidator("query", LeaderboardLimitQuerySchema), async (c) => {
        try {
            const { limit } = c.req.valid("query")
            const { leaderboardRepo } = c.get("repos")

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

    /**
     * GET /leaderboards/games/:id - Game-specific leaderboard (top users in a game)
     * Returns users ranked by their score in a specific game
     */
    .get(
        "/games/:id",
        zValidator("param", LeaderboardGameIdParamSchema),
        zValidator("query", LeaderboardLimitQuerySchema),
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { limit } = c.req.valid("query")
                const { leaderboardRepo, gameRepo } = c.get("repos")

                // Check if game exists
                const game = await gameRepo.findById(id)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

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

    /**
     * GET /leaderboards/games/:id/guilds - Game-specific guild leaderboard
     * Returns guilds ranked by their members' total score in a specific game
     */
    .get(
        "/games/:id/guilds",
        zValidator("param", LeaderboardGameIdParamSchema),
        zValidator("query", LeaderboardLimitQuerySchema),
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { limit } = c.req.valid("query")
                const { leaderboardRepo, gameRepo } = c.get("repos")

                // Check if game exists
                const game = await gameRepo.findById(id)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

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
