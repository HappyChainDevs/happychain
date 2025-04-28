import type { Address } from "@happy.tech/common"
import { z } from "@hono/zod-openapi"
import { isHex } from "viem"
import type { GameTableId, GuildTableId, UserTableId } from "../../db/types"

// Global leaderboard entry schema (user-based)
export const GlobalLeaderboardEntrySchema = z
    .object({
        user_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        username: z.string(), // is unique (enforced in db)
        primary_wallet: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address), // is unique (enforced in db)
        total_score: z.number().int(),
    })
    .strict()
    .openapi({
        example: {
            user_id: 1,
            username: "player1",
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            total_score: 5000,
        },
    })

// Guild leaderboard entry schema
export const GuildLeaderboardEntrySchema = z
    .object({
        guild_id: z
            .number()
            .int()
            .transform((val) => val as GuildTableId),
        guild_name: z.string(),
        icon_url: z.string().nullable(),
        total_score: z.number().int(),
        member_count: z.number().int(),
    })
    .strict()
    .openapi({
        example: {
            guild_id: 1,
            guild_name: "Alpha Guild",
            icon_url: "https://example.com/icon.png",
            total_score: 12000,
            member_count: 5,
        },
    })

// Game-specific leaderboard entry schema (user-based)
export const GameLeaderboardEntrySchema = z
    .object({
        game_id: z
            .number()
            .int()
            .transform((val) => val as GameTableId),
        user_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        username: z.string(),
        primary_wallet: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address),
        score: z.number().int(),
    })
    .strict()
    .openapi({
        example: {
            game_id: 42,
            user_id: 2,
            username: "player2",
            primary_wallet: "0x1234567890abcdef1234567890abcdef12345678",
            score: 3000,
        },
    })

// Game-specific guild leaderboard entry schema
export const GameGuildLeaderboardEntrySchema = z
    .object({
        game_id: z
            .number()
            .int()
            .transform((val) => val as GameTableId),
        guild_id: z
            .number()
            .int()
            .transform((val) => val as GuildTableId),
        guild_name: z.string(),
        icon_url: z.string().nullable(),
        total_score: z.number().int(),
        member_count: z.number().int(),
    })
    .strict()
    .openapi({
        example: {
            game_id: 42,
            guild_id: 2,
            guild_name: "Beta Guild",
            icon_url: "https://example.com/beta-icon.png",
            total_score: 8000,
            member_count: 3,
        },
    })

// Parameter and query validation schemas

// Limit query parameter schema
export const LeaderboardLimitQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
})

// Game ID parameter schema
export const LeaderboardGameIdParamSchema = z.object({
    id: z.coerce
        .number()
        .int()
        .positive()
        .transform((id) => id as GameTableId),
})
