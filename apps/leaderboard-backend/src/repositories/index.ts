import { db } from "../db/driver"
import { GameRepository } from "./GamesRepository"
import { GuildRepository } from "./GuildsRepository"
import { LeaderBoardRepository } from "./LeaderBoardRepository"
import { UserRepository } from "./UsersRepository"

export type Repositories = {
    userRepo: UserRepository
    guildRepo: GuildRepository
    leaderboardRepo: LeaderBoardRepository
    gameRepo: GameRepository
}

export const repositories: Repositories = {
    userRepo: new UserRepository(db),
    guildRepo: new GuildRepository(db),
    leaderboardRepo: new LeaderBoardRepository(db),
    gameRepo: new GameRepository(db),
}
