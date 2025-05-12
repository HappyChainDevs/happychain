import { db } from "../db/driver"
import { AuthRepository } from "./AuthRepository"
import { GameRepository, GameScoreRepository } from "./GamesRepository"
import { GuildRepository } from "./GuildsRepository"
import { LeaderBoardRepository } from "./LeaderBoardRepository"
import { UserRepository } from "./UsersRepository"

export type Repositories = {
    authRepo: AuthRepository
    userRepo: UserRepository
    guildRepo: GuildRepository
    gameRepo: GameRepository
    gameScoreRepo: GameScoreRepository
    leaderboardRepo: LeaderBoardRepository
}

export const repositories: Repositories = {
    authRepo: new AuthRepository(db),
    userRepo: new UserRepository(db),
    guildRepo: new GuildRepository(db),
    gameRepo: new GameRepository(db),
    gameScoreRepo: new GameScoreRepository(db),
    leaderboardRepo: new LeaderBoardRepository(db),
}
