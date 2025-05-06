import { z } from "@hono/zod-openapi"
import { resolver } from "hono-openapi/zod"
import { type Address, isHex } from "viem"

// ====================================================================================================
// Response Schemas

const GuildResponseSchema = z
    .object({
        id: z.number().int(),
        name: z.string(),
        icon_url: z.string().nullable(),
        creator_id: z.number().int(),
        created_at: z.string(),
        updated_at: z.string(),
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

const GuildMemberResponseSchema = z
    .object({
        id: z.number().int(),
        guild_id: z.number().int(),
        user_id: z.number().int(),
        is_admin: z.boolean(),
        joined_at: z.string(),
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

export const GuildResponseSchemaObj = resolver(GuildResponseSchema)

export const GuildListResponseSchemaObj = resolver(z.array(GuildResponseSchema))

export const GuildMemberResponseSchemaObj = resolver(GuildMemberResponseSchema)

export const GuildMemberListResponseSchemaObj = resolver(z.array(GuildMemberResponseSchema))

// Generic error schema
export const ErrorResponseSchemaObj = resolver(z.object({ ok: z.literal(false), error: z.string() }))

// ====================================================================================================
// Request Body Schemas

export const GuildQuerySchema = z
    .object({
        name: z.string().optional(),
        creator_id: z.string().optional(),
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

export const GuildCreateRequestSchema = z
    .object({
        name: z.string().min(3).max(50),
        icon_url: z.string().url().nullable().optional(),
        creator_id: z.number().int(),
    })
    .strict()
    .openapi({
        example: {
            name: "Alpha Guild",
            icon_url: "https://example.com/icon.png",
            creator_id: 1,
        },
    })

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

export const GuildMemberAddRequestSchema = z
    .object({
        user_id: z.number().int().optional(),
        username: z.string().min(1).optional(),
        is_admin: z.boolean().default(false).optional(),
    })
    .strict()
    .refine((data) => data.user_id !== undefined || data.username !== undefined, {
        message: "Either user_id or username must be provided",
    })
    .openapi({
        example: {
            username: "aryan",
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

// ====================================================================================================
// Request Param Schemas

export const GuildIdParamSchema = z
    .object({
        id: z.string().regex(/^\d+$/, { message: "Guild ID must be a number" }),
    })
    .strict()
    .openapi({
        example: {
            id: "1",
        },
    })

export const GuildMemberParamSchema = z
    .object({
        id: GuildIdParamSchema.shape.id,
        userId: z.string().regex(/^\d+$/, { message: "User ID must be a number" }),
    })
    .strict()
    .openapi({
        example: {
            id: "1",
            userId: "2",
        },
    })
