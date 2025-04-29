import type { Address } from "@happy.tech/common"
import { z } from "@hono/zod-openapi"
import { isHex } from "viem"
import type { GuildTableId, UserTableId } from "../../db/types"

// Guild API response schema (for GET, POST responses)
export const GuildResponseSchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as GuildTableId),
        name: z.string(),
        icon_url: z.string().nullable(),
        creator_id: z
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
            name: "Alpha Guild",
            icon_url: "https://example.com/icon.png",
            creator_id: 1,
            created_at: "2023-01-01T00:00:00.000Z",
            updated_at: "2023-01-01T00:00:00.000Z",
        },
    })

// Guild member response schema
export const GuildMemberResponseSchema = z
    .object({
        id: z.number().int(),
        guild_id: z
            .number()
            .int()
            .transform((val) => val as GuildTableId),
        user_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        is_admin: z.boolean(),
        joined_at: z.string().datetime(),
        // Extended properties when including user details
        username: z.string().optional(),
        primary_wallet: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address)
            .optional(),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            guild_id: 1,
            user_id: 1,
            is_admin: true,
            joined_at: "2023-01-01T00:00:00.000Z",
            username: "player1",
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })

// Guild query schema for GET /guilds (query params)
export const GuildQuerySchema = z
    .object({
        name: z.string().optional(),
        creator_id: z
            .string()
            .transform((val) => Number.parseInt(val, 10) as UserTableId)
            .optional(),
        include_members: z.boolean().default(false).optional(),
    })
    .strict()
    .openapi({
        example: {
            name: "Alpha",
            creator_id: "1",
            include_members: true,
        },
    })

// Guild creation request schema (for POST /guilds)
export const GuildCreateRequestSchema = z
    .object({
        name: z.string().min(3).max(50),
        icon_url: z.string().url().nullable().optional(),
        creator_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
    })
    .strict()
    .openapi({
        example: {
            name: "Alpha Guild",
            icon_url: "https://example.com/icon.png",
            creator_id: 1,
        },
    })

// Guild update request schema (for PATCH /guilds/:id)
export const GuildUpdateRequestSchema = z
    .object({
        name: z.string().min(3).max(50).optional(),
        icon_url: z.string().url().nullable().optional(),
    })
    .strict()
    .refine((data) => data.name !== undefined || data.icon_url !== undefined, {
        message: "At least one of name or icon_url must be provided",
    })
    .openapi({
        example: {
            name: "Beta Guild",
            icon_url: "https://example.com/new-icon.png",
        },
    })

// Guild member add request schema (for POST /guilds/:id/members)
export const GuildMemberAddRequestSchema = z
    .object({
        user_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        is_admin: z.boolean().default(false).optional(),
    })
    .strict()
    .openapi({
        example: {
            user_id: 2,
            is_admin: false,
        },
    })

// Guild member update request schema (for PATCH /guilds/:id/members/:userId)
export const GuildMemberUpdateRequestSchema = z
    .object({
        is_admin: z.boolean(),
    })
    .strict()
    .openapi({
        example: {
            is_admin: true,
        },
    })

// Guild ID path parameter schema (for endpoints with :id)
export const GuildIdParamSchema = z
    .object({
        id: z
            .string()
            .regex(/^\d+$/, { message: "Guild ID must be a number" })
            .transform((val) => Number.parseInt(val, 10) as GuildTableId),
    })
    .strict()
    .openapi({
        example: {
            id: "1",
        },
    })

// Combined guild ID and user ID parameter schema (for endpoints with :id/members/:userId)
export const GuildMemberParamSchema = z
    .object({
        id: GuildIdParamSchema.shape.id,
        userId: z
            .string()
            .regex(/^\d+$/, { message: "User ID must be a number" })
            .transform((val) => Number.parseInt(val, 10) as UserTableId),
    })
    .strict()
    .openapi({
        example: {
            id: "1",
            userId: "2",
        },
    })
