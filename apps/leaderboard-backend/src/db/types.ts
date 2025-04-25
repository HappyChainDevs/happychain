import type { Address } from "@happy.tech/common"
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely"

// --- Branded ID types for strong nominal typing ---
export type UserTableId = number & { _brand: "users_id" }
export type GuildTableId = number & { _brand: "guilds_id" }
export type GameTableId = number & { _brand: "games_id" }

// Main Kysely database schema definition
export interface Database {
    users: UserTable
    guilds: GuildTable
    games: GameTable
}

// Registered users
export interface UserTable {
    id: Generated<UserTableId>
    happy_wallet: Address // primary login wallet
    username: string
    guild_id: ColumnType<GuildTableId | null, null, GuildTableId | null> // FK to guilds, nullable, null at creation
    created_at: ColumnType<Date, string, never>
}

// Guilds (groups of users, managed by an admin)
export interface GuildTable {
    id: Generated<GuildTableId>
    name: string
    admin_id: UserTableId // FK to users, creator/admin of the guild
    created_at: ColumnType<Date, string, never>
}

// Games available on the platform
export interface GameTable {
    id: Generated<GameTableId>
    name: string
    icon_url: string | null
    admin_id: UserTableId // FK to users, creator/admin of the game
    created_at: ColumnType<Date, string, never>
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
