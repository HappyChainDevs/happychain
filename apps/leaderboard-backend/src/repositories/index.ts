import { db } from "../db/driver"
import { GuildsRepository } from "./GuildsRepository"
import { UserRepository } from "./UsersRepository"

export type Repositories = {
    userRepo: UserRepository
    guildRepo: GuildsRepository
}

export const repositories: Repositories = {
    userRepo: new UserRepository(db),
    guildRepo: new GuildsRepository(db),
}
