import type { Address } from "@happy.tech/common"
import { z } from "@hono/zod-openapi"
import { isHex } from "viem"
import type { GameTableId, UserTableId } from "../db/types"

// Game API response schema (for GET, POST responses)
export const GameResponseSchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as GameTableId),
        name: z.string().min(3).max(50), // must be unique (enforced in DB)
        icon_url: z.string().nullable(),
        description: z.string().nullable(),
        admin_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        created_at: z.string().datetime(),
        updated_at: z.string().datetime(),
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

// User game score response schema
export const UserGameScoreResponseSchema = z
    .object({
        id: z.number().int(),
        user_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        game_id: z
            .number()
            .int()
            .transform((val) => val as GameTableId),
        score: z.number().int(),
        metadata: z.string().optional(),
        created_at: z.string().datetime(),
        updated_at: z.string().datetime(),
        // Extended properties when including additional details
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

// Game query schema for GET /games (query params)
export const GameQuerySchema = z
    .object({
        name: z.string().min(3).max(50).optional(), // must be unique (enforced in DB)
        admin_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId)
            .optional(),
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

// Game creation request schema (for POST /games)
export const GameCreateRequestSchema = z
    .object({
        name: z.string().min(3).max(50), // must be unique (enforced in DB)
        icon_url: z.string().url().nullable().optional(),
        description: z.string().nullable().optional(),
        admin_wallet: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address),
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

// Game update request schema (for PATCH /games/:id)
export const GameUpdateRequestSchema = z
    .object({
        name: z.string().min(3).max(50).optional(), // must be unique (enforced in DB)
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

// Score submission request schema (for POST /scores)
export const ScoreSubmitRequestSchema = z
    .object({
        user_wallet: z
            .string()
            .refine(isHex, { message: "User wallet must be a valid hex string" })
            .transform((val) => val as Address),
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

// Game scores query schema (for GET /games/:id/scores)
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

// Game ID path parameter schema
export const GameIdParamSchema = z
    .object({
        id: z
            .string()
            .regex(/^\d+$/, { message: "Game ID must be a number" })
            .transform((val) => Number.parseInt(val, 10) as GameTableId),
    })
    .strict()

// Admin ID path parameter schema
export const AdminIdParamSchema = z
    .object({
        admin_id: z
            .string()
            .regex(/^\d+$/, { message: "Admin ID must be a number" })
            .transform((val) => Number.parseInt(val, 10) as UserTableId),
    })
    .strict()

// Admin wallet path parameter schema
export const AdminWalletParamSchema = z
    .object({
        admin_wallet: z
            .string()
            .refine(isHex, { message: "Admin wallet must be a valid hex string" })
            .transform((val) => val as Address),
    })
    .strict()

// User wallet path parameter schema
export const UserWalletParamSchema = z
    .object({
        user_wallet: z
            .string()
            .refine(isHex, { message: "User wallet must be a valid hex string" })
            .transform((val) => val as Address),
    })
    .strict()

// Combined Game ID and User ID parameter schema
export const GameUserParamSchema = z
    .object({
        id: GameIdParamSchema.shape.id,
        userId: z
            .string()
            .regex(/^\d+$/, { message: "User ID must be a number" })
            .transform((val) => Number.parseInt(val, 10) as UserTableId),
    })
    .strict()
