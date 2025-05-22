import { z } from "@hono/zod-openapi"
import { type Address, isHex } from "viem"
import { GuildRole } from "../../auth/roles"

// ====================================================================================================
// Response Schemas

export const GuildResponseSchema = z
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

export const GuildMemberResponseSchema = z
    .object({
        id: z.number().int(),
        guild_id: z.number().int(),
        user_id: z.number().int(),
        role: z.nativeEnum(GuildRole),
        joined_at: z.string(),
        // Extended properties when including user details
        username: z.string().optional(),
        primary_wallet: z.string().refine(isHex).optional().openapi({
            type: "string",
        }),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            guild_id: 1,
            user_id: 1,
            role: GuildRole.ADMIN,
            joined_at: "2023-01-01T00:00:00.000Z",
            username: "player1",
            primary_wallet: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa",
        },
    })

export const GuildResponseSchemaArray = z.array(GuildResponseSchema)

export const GuildMemberResponseSchemaArray = z.array(GuildMemberResponseSchema)

// ====================================================================================================
// Request Body Schemas

export const GuildQuerySchema = z
    .object({
        name: z.string().optional(),
        creator_id: z.number().int().optional(),
        include_members: z.boolean().default(false).optional(),
    })
    .strict()
    .openapi({
        example: {
            name: "Alpha",
            creator_id: 1,
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
        role: z.nativeEnum(GuildRole).default(GuildRole.MEMBER).optional(),
    })
    .strict()
    .refine((data) => data.user_id !== undefined || data.username !== undefined, {
        message: "Either user_id or username must be provided",
    })
    .openapi({
        example: {
            username: "aryan",
            role: GuildRole.MEMBER,
        },
    })

// Guild member update request schema (for PATCH /guilds/:id/members/:userId)
export const GuildMemberUpdateRequestSchema = z
    .object({
        role: z.nativeEnum(GuildRole),
    })
    .strict()
    .openapi({
        example: {
            role: GuildRole.ADMIN,
        },
    })

// ====================================================================================================
// Request Param Schemas

export const GuildIdParamSchema = z
    .object({
        id: z.string().transform((val) => Number.parseInt(val)),
    })
    .openapi({
        example: {
            id: "1",
        },
    })

export const GuildMemberIdParamSchema = z
    .object({
        member_id: z.string().transform((val) => Number.parseInt(val)),
    })
    .openapi({
        example: {
            member_id: "1",
        },
    })
