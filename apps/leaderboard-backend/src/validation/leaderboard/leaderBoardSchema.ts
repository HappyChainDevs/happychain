import { z } from "@hono/zod-openapi"
import { isHex } from "viem"

// ====================================================================================================
// Response Schemas

export const GlobalLeaderboardEntrySchema = z.array(
    z
        .object({
            user_id: z.number().int(),
            username: z.string(), // is unique (enforced in db)
            primary_wallet: z.string().refine(isHex),
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
        }),
)

export const GuildLeaderboardEntrySchema = z.array(
    z
        .object({
            guild_id: z.number().int(),
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
        }),
)

export const GameLeaderboardEntrySchema = z.array(
    z
        .object({
            game_id: z.number().int(),
            user_id: z.number().int(),
            username: z.string(),
            primary_wallet: z.string().refine(isHex),
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
        }),
)

export const GameGuildLeaderboardEntrySchema = z.array(
    z
        .object({
            game_id: z.number().int(),
            guild_id: z.number().int(),
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
        }),
)

// ====================================================================================================
// Request Param/Query Schemas

export const LeaderboardLimitQuerySchema = z.object({
    limit: z
        .string()
        .transform((val) => Number.parseInt(val))
        .default("50"),
})

export const LeaderboardGameIdParamSchema = z.object({
    id: z.string().transform((val) => Number.parseInt(val)),
})
