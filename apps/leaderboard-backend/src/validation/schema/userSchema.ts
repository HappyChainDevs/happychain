import { z } from "@hono/zod-openapi"
import { isHex } from "viem"
import type { GuildTableId } from "../../db/types"

// User delete request schema (for DELETE /users/:happy_wallet)
export const UserDeleteRequestSchema = z
    .object({
        happy_wallet: z.string().refine(isHex).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
    })
    .strict()
    .openapi({
        example: {
            happy_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })

// User API response schema (for GET, POST responses)
export const UserResponseSchema = z
    .object({
        id: z.number().int().openapi({ example: 1 }),
        happy_wallet: z.string().refine(isHex).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
        username: z.string().openapi({ example: "username" }),
        guild_id: z
            .number()
            .nullable()
            .transform((val) => (val === null || val === undefined ? val : (val as GuildTableId)))
            .openapi({ example: 1 }),
        created_at: z.string().datetime().openapi({ example: "2023-01-01T00:00:00.000Z" }),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            happy_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            username: "username",
            guild_id: 1,
            created_at: "2023-01-01T00:00:00.000Z",
        },
    })

// User creation request schema (for POST /users)
export const UserCreateRequestSchema = z
    .object({
        happy_wallet: z.string().refine(isHex).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
        username: z.string().openapi({ example: "username" }),
    })
    .strict()
    .openapi({
        example: {
            happy_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            username: "username",
        },
    })

// User update request schema (for PATCH /users/:id)
export const UserUpdateRequestSchema = z
    .object({
        username: z.string().openapi({ example: "username" }).optional(),
        guild_id: z
            .number()
            .nullable()
            .optional()
            .transform((val) => (val === null || val === undefined ? val : (val as GuildTableId)))
            .openapi({ example: 1 }),
    })
    .strict()
    .refine((data) => data.username !== undefined || data.guild_id !== undefined, {
        message: "At least one of username or guild_id must be provided",
    })
    .openapi({
        example: {
            username: "new_username",
            guild_id: 2,
        },
    })

// User query schema for GET /users (query params)
export const UserQuerySchema = z
    .object({
        happy_wallet: z
            .string()
            .refine(isHex)
            .optional()
            .openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
        username: z.string().optional().openapi({ example: "username" }),
        guild_id: z.number().optional().openapi({ example: 1 }),
    })
    .strict()
    .refine((data) => data.happy_wallet !== undefined || data.username !== undefined || data.guild_id !== undefined, {
        message: "At least one filter (happy_wallet, username, or guild_id) must be provided",
    })
    .openapi({
        example: {
            happy_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
            username: "username",
            guild_id: 1,
        },
    })
