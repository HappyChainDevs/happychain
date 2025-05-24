import { db } from "../db/driver"
import { GameRepository, GameScoreRepository } from "./GamesRepository"
import { GuildRepository } from "./GuildsRepository"
import { LeaderBoardRepository } from "./LeaderBoardRepository"
import { UserRepository } from "./UsersRepository"

export type Repositories = {
    userRepo: UserRepository
    guildRepo: GuildRepository
    leaderboardRepo: LeaderBoardRepository
    gameRepo: GameRepository
    gameScoreRepo: GameScoreRepository
}

export const repositories: Repositories = {
    userRepo: new UserRepository(db),
    guildRepo: new GuildRepository(db),
    leaderboardRepo: new LeaderBoardRepository(db),
    gameRepo: new GameRepository(db),
    gameScoreRepo: new GameScoreRepository(db),
}
