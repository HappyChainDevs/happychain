import type { Address, UUID } from "@happy.tech/common"
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely"

// Main Kysely database schema definition
export interface Database {
    users: UserTable
    guilds: GuildTable
    games: GameTable
    user_game_scores: UserGameScoreTable
    sessions: SessionTable
}

// Registered users
export interface UserTable {
    id: Generated<number>
    happy_wallet: Address // primary login wallet
    username: string
    guild_id: number | null // FK to guilds
    created_at: ColumnType<Date, string, never>
}

// Guilds (groups of users, managed by an admin)
export interface GuildTable {
    id: Generated<number>
    name: string
    admin_id: ColumnType<number, number, number> // FK to users, creator/admin of the guild
    created_at: ColumnType<Date, string, never>
}

// Games available on the platform
// Games available on the platform
export interface GameTable {
    id: Generated<number>
    name: string
    icon_url: string | null
    admin_id: ColumnType<number, number, number> // FK to users, creator/admin of the game
    created_at: ColumnType<Date, string | undefined, never>
    last_updated_at: ColumnType<Date, string, never> // set by system, not user input
}

// Scores for each user per game
export interface UserGameScoreTable {
    id: Generated<number>
    user_id: number // FK to users
    game_id: number // FK to games
    score: number
    last_updated_at: ColumnType<Date, string, never> // set by system, not user input
}

// User login sessions, authenticated by wallet signature
export interface SessionTable {
    id: Generated<number>
    user_id: number // FK to users
    session_uuid: UUID
    created_at: ColumnType<Date, string, never>
    // No expires_at, sessions do not expire by default
}

// Kysely helper types
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
