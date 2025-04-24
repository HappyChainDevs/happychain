import { Hono } from "hono"
import { db } from "../../db/driver"
import { GameRepository } from "../../repository/GameRepository"
import { UserGameScoreRepository } from "../../repository/UserGameScoreRepository"

const gameRepo = new GameRepository(db)
const scoreRepo = new UserGameScoreRepository(db)

const gamesApi = new Hono()

// POST /games - create a new game
gamesApi.post("/", async (c) => {
    try {
        const body = await c.req.json()
        const { name, icon_url, admin_id, created_at, last_updated_at } = body
        if (!name || !admin_id || !created_at || !last_updated_at) {
            return c.json({ error: "Missing required fields" }, 400)
        }
        const newGame = await gameRepo.create({ name, icon_url, admin_id, created_at, last_updated_at })
        return c.json(newGame, 201)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// GET /games - list all games
gamesApi.get("/", async (c) => {
    try {
        const games = await gameRepo.find({})
        return c.json(games)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// POST /games/:gameId/scores - admin updates any user's score for a game
gamesApi.post("/:gameId/scores", async (c) => {
    try {
        const gameId = Number(c.req.param("gameId"))
        const { user_id, score, acting_user_id } = await c.req.json()
        if (!user_id || score === undefined || !acting_user_id) {
            return c.json({ error: "Missing required fields" }, 400)
        }
        const updated = await scoreRepo.updateScoreByAdmin(gameId, user_id, score, acting_user_id)
        return c.json(updated)
    } catch (err) {
        console.error(err)
        return c.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, 500)
    }
})

// GET /games/:gameId/leaderboard - get sorted leaderboard for a game (users)
gamesApi.get("/:gameId/leaderboard", async (c) => {
    try {
        const gameId = Number(c.req.param("gameId"))
        const leaderboard = await scoreRepo.getGameLeaderboard(gameId)
        return c.json(leaderboard)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// GET /games/:gameId/guild-leaderboard - get sorted guild leaderboard for a game
gamesApi.get("/:gameId/guild-leaderboard", async (c) => {
    try {
        const gameId = Number(c.req.param("gameId"))
        const leaderboard = await scoreRepo.getGuildLeaderboard(gameId)
        return c.json(leaderboard)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export { gamesApi }
