import { Hono } from "hono"
// import { db } from "../../db/driver"
// import { GamesRepository } from "../../repositories/GamesRepository"
// import { LeaderBoardRepository } from "../../repositories/LeaderBoardRepository"

// const gameRepo = new GamesRepository(db)
// const scoreRepo = new LeaderBoardRepository(db)

const gamesApi = new Hono()

export { gamesApi }
