import { z } from "@hono/zod-openapi"
import { isHex } from "viem"

// ====================================================================================================
// Response Schemas

export const GameResponseSchema = z
    .object({
        id: z.number().int(),
        name: z.string().min(3).max(50),
        icon_url: z.string().nullable(),
        description: z.string().nullable(),
        admin_id: z.number().int(),
        created_at: z.string(),
        updated_at: z.string(),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            name: "Crypto Racer",
            icon_url: "https://example.com/game-icon.png",
            description: "Race to earn the most crypto",
            admin_id: 1,
            created_at: "2023-01-01T00:00:00.000Z",
            updated_at: "2023-01-01T00:00:00.000Z",
        },
    })

export const GameListResponseSchema = z.array(GameResponseSchema)

export const UserGameScoreResponseSchema = z
    .object({
        id: z.number().int(),
        user_id: z.number().int(),
        game_id: z.number().int(),
        score: z.number().int(),
        metadata: z.string().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        username: z.string().optional(),
        game_name: z.string().optional(),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            user_id: 2,
            game_id: 3,
            score: 1000,
            metadata: '{"level": 5, "items": ["sword", "shield"]}',
            created_at: "2023-01-01T00:00:00.000Z",
            updated_at: "2023-01-01T00:00:00.000Z",
            username: "player1",
            game_name: "Crypto Racer",
        },
    })

// ====================================================================================================
// Request Body Schemas

export const GameQuerySchema = z
    .object({
        name: z.string().min(3).max(50).optional(),
        admin_id: z.number().int().optional(),
    })
    .strict()
    .refine((data) => data.name !== undefined || data.admin_id !== undefined, {
        message: "At least one filter (name or admin_id) must be provided",
    })
    .openapi({
        example: {
            name: "Crypto",
            admin_id: 1,
        },
    })

export const GameCreateRequestSchema = z
    .object({
        name: z.string().min(3).max(50),
        icon_url: z.string().url().nullable().optional(),
        description: z.string().nullable().optional(),
        admin_wallet: z.string().refine(isHex),
    })
    .strict()
    .openapi({
        example: {
            name: "Crypto Racer",
            icon_url: "https://example.com/game-icon.png",
            description: "Race to earn the most crypto",
            admin_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })

export const GameUpdateRequestSchema = z
    .object({
        name: z.string().min(3).max(50).optional(),
        icon_url: z.string().url().nullable().optional(),
        description: z.string().nullable().optional(),
    })
    .strict()
    .refine((data) => data.name !== undefined || data.icon_url !== undefined || data.description !== undefined, {
        message: "At least one field must be provided",
    })
    .openapi({
        example: {
            name: "Crypto Racing",
            icon_url: "https://example.com/updated-icon.png",
            description: "Updated game description",
        },
    })

export const ScoreSubmitRequestSchema = z
    .object({
        user_wallet: z.string().refine(isHex, { message: "User wallet must be a valid hex string" }),
        score: z.number().int().positive(),
        metadata: z.string().optional(),
    })
    .strict()
    .openapi({
        example: {
            user_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            score: 1000,
            metadata: '{"level": 5, "items": ["sword", "shield"]}',
        },
    })

export const GameScoresQuerySchema = z
    .object({
        top: z.number().int().positive().optional().default(50),
    })
    .strict()
    .openapi({
        example: {
            top: 10,
        },
    })

// ====================================================================================================
// Request Param Schemas

export const GameIdParamSchema = z
    .object({
        id: z.string().transform((val) => Number.parseInt(val)),
    })
    .strict()
    .openapi({
        example: { id: "1" },
    })

export const AdminIdParamSchema = z
    .object({
        admin_id: z.string().transform((val) => Number.parseInt(val)),
    })
    .strict()
    .openapi({
        example: { admin_id: "1" },
    })

export const AdminWalletParamSchema = z
    .object({
        admin_wallet: z.string().refine(isHex, { message: "Admin wallet must be a valid hex string" }),
    })
    .strict()
    .openapi({
        example: { admin_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" },
    })

export const UserWalletParamSchema = z
    .object({
        user_wallet: z.string().refine(isHex, { message: "User wallet must be a valid hex string" }),
    })
    .strict()
    .openapi({
        example: { user_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" },
    })
