import { Hono } from "hono"
import { db } from "../../db/driver"
import { UserGameScoreRepository } from "../../repository/UserGameScoreRepository"

const scoreRepo = new UserGameScoreRepository(db)

const leaderboardApi = new Hono()

// GET /leaderboard - get global leaderboard (all games)
leaderboardApi.get("/", async (c) => {
    try {
        const leaderboard = await scoreRepo.getCompleteLeaderboard()
        return c.json(leaderboard)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export { leaderboardApi }
