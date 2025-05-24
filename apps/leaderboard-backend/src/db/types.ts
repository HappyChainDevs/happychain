import type { Address } from "@happy.tech/common"
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely"

// --- Branded ID types for strong nominal typing ---
export type UserTableId = number & { _brand: "users_id" }
export type GuildTableId = number & { _brand: "guilds_id" }
export type GameTableId = number & { _brand: "games_id" }
export type ScoreTableId = number & { _brand: "scores_id" }
export type GuildMemberTableId = number & { _brand: "guild_members_id" }

// Main Kysely database schema definition
export interface Database {
    users: UserTable
    user_wallets: UserWalletTable
    guilds: GuildTable
    guild_members: GuildMemberTable
    games: GameTable
    user_game_scores: UserGameScoreTable
}

// Registered users
export interface UserTable {
    id: Generated<UserTableId>
    primary_wallet: Address // Primary wallet for the user
    username: string
    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string>
}

// User wallet addresses (allows multiple wallets per user)
export interface UserWalletTable {
    id: Generated<number>
    user_id: UserTableId // FK to users
    wallet_address: Address
    is_primary: boolean // If this is the user's primary wallet
    created_at: ColumnType<Date, string | undefined, never>
}

// Guilds (groups of users)
export interface GuildTable {
    id: Generated<GuildTableId>
    name: string
    icon_url: string | null
    creator_id: UserTableId // FK to users, original creator
    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string>
}

// Guild membership JOIN table (users in guilds with role)
export interface GuildMemberTable {
    id: Generated<GuildMemberTableId>
    guild_id: GuildTableId // FK to guilds
    user_id: UserTableId // FK to users
    is_admin: boolean // Whether user is an admin of this guild
    joined_at: ColumnType<Date, string | undefined, never>
}

// Games available on the platform
export interface GameTable {
    id: Generated<GameTableId>
    name: string
    icon_url: string | null
    description: string | null
    admin_id: UserTableId // FK to users, creator/admin of the game
    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string>
}

// User scores in games
export interface UserGameScoreTable {
    id: Generated<ScoreTableId>
    user_id: UserTableId // FK to users
    game_id: GameTableId // FK to games
    score: number // The actual score
    metadata: string | null // JSON string for any additional game-specific data
    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string>
}

// Kysely helper types
export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>

export type UserWallet = Selectable<UserWalletTable>
export type NewUserWallet = Insertable<UserWalletTable>
export type UpdateUserWallet = Updateable<UserWalletTable>

export type Guild = Selectable<GuildTable>
export type NewGuild = Insertable<GuildTable>
export type UpdateGuild = Updateable<GuildTable>

export type GuildMember = Selectable<GuildMemberTable>
export type NewGuildMember = Insertable<GuildMemberTable>
export type UpdateGuildMember = Updateable<GuildMemberTable>
export type GuildMemberWithUser = GuildMember & {
    username: string
    primary_wallet: Address
}

export type Game = Selectable<GameTable>
export type NewGame = Insertable<GameTable>
export type UpdateGame = Updateable<GameTable>

export type UserGameScore = Selectable<UserGameScoreTable>
export type NewUserGameScore = Insertable<UserGameScoreTable>
export type UpdateUserGameScore = Updateable<UserGameScoreTable>

export interface GlobalLeaderboardEntry {
    user_id: UserTableId
    username: string
    primary_wallet: Address
    total_score: number
}

export interface GuildLeaderboardEntry {
    guild_id: GuildTableId
    guild_name: string
    icon_url: string | null
    total_score: number
    member_count: number
}

export interface GameLeaderboardEntry {
    game_id: GameTableId
    user_id: UserTableId
    username: string
    primary_wallet: Address
    score: number
}

export interface GameGuildLeaderboardEntry {
    game_id: GameTableId
    guild_id: GuildTableId
    guild_name: string
    icon_url: string | null
    total_score: number
    member_count: number
}
