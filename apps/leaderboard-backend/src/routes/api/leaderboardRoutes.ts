import { Hono } from "hono"
// import { db } from "../../db/driver"
// import { LeaderBoardRepository } from "../../repositories/LeaderBoardRepository"

// const scoreRepo = new LeaderBoardRepository(db)

const leaderboardApi = new Hono()

// GET /leaderboard - get global leaderboard (all games)
leaderboardApi.get("/", async (c) => {
    try {
        // const leaderboard = await scoreRepo.getCompleteLeaderboard()
        return c.json({ message: "Get leaderboard - not implemented" }, 501)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export { leaderboardApi }
