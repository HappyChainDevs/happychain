import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely"
import type { Address } from "@happy.tech/common"

export interface Database {
    users: UserTable
    guilds: GuildTable
    games: GameTable
    user_game_scores: UserGameScoreTable
    sessions: SessionTable
}

export interface UserTable {
    id: Generated<number>
    happy_wallet: Address // primary login wallet
    name: string
    guild_id: number | null // FK to guilds
    created_at: ColumnType<Date, string, never>
}

export interface GuildTable {
    id: Generated<number>
    name: string
    code: string // unique code for joining
    created_at: ColumnType<Date, string, never>
}

export interface GameTable {
    id: Generated<number>
    name: string
    icon_url: string | null
    created_at: ColumnType<Date, string, never>
}

export interface UserGameScoreTable {
    id: Generated<number>
    user_id: number // FK to users
    game_id: number // FK to games
    score: number
    played_at: ColumnType<Date, string, never>
}

export interface SessionTable {
    id: Generated<number>
    user_id: number // FK to users
    session_uuid: string
    created_at: ColumnType<Date, string, never>
    expires_at: ColumnType<Date, string, never> | null
}

export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>

export type Guild = Selectable<GuildTable>
export type NewGuild = Insertable<GuildTable>
export type UpdateGuild = Updateable<GuildTable>

export type Game = Selectable<GameTable>
export type NewGame = Insertable<GameTable>
export type UpdateGame = Updateable<GameTable>

export type UserGameScore = Selectable<UserGameScoreTable>
export type NewUserGameScore = Insertable<UserGameScoreTable>
export type UpdateUserGameScore = Updateable<UserGameScoreTable>

export type Session = Selectable<SessionTable>
export type NewSession = Insertable<SessionTable>
export type UpdateSession = Updateable<SessionTable>
