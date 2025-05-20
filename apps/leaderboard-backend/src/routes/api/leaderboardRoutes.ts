import { Hono } from "hono"
import type { GameTableId } from "../../db/types"
import {
    GameGuildLeaderboardDescription,
    GameGuildLeaderboardParamValidation,
    GameGuildLeaderboardQueryValidation,
    GameLeaderboardDescription,
    GameLeaderboardParamValidation,
    GameLeaderboardQueryValidation,
    GlobalLeaderboardDescription,
    GlobalLeaderboardValidation,
    GuildLeaderboardDescription,
    GuildLeaderboardValidation,
} from "../../validation/leaderboard"

export default new Hono()

    /**
     * GET /leaderboards/global - Global leaderboard (top users across all games)
     * Returns users ranked by their total score across all games
     */
    .get("/global", GlobalLeaderboardDescription, GlobalLeaderboardValidation, async (c) => {
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
    .get("/guilds", GuildLeaderboardDescription, GuildLeaderboardValidation, async (c) => {
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
        GameLeaderboardDescription,
        GameLeaderboardParamValidation,
        GameLeaderboardQueryValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { limit } = c.req.valid("query")
                const { leaderboardRepo, gameRepo } = c.get("repos")

                // Check if game exists
                const gameId = id as GameTableId
                const game = await gameRepo.findById(gameId)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

                const leaderboard = await leaderboardRepo.getGameLeaderboard(gameId, limit)
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
        GameGuildLeaderboardDescription,
        GameGuildLeaderboardParamValidation,
        GameGuildLeaderboardQueryValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { limit } = c.req.valid("query")
                const { leaderboardRepo, gameRepo } = c.get("repos")

                // Check if game exists
                const gameId = id as GameTableId
                const game = await gameRepo.findById(gameId)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

                const leaderboard = await leaderboardRepo.getGameGuildLeaderboard(gameId, limit)
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
