import type { Address } from "@happy.tech/common"
import { z } from "@hono/zod-openapi"
import { isHex } from "viem"
import type { GuildTableId, UserTableId } from "../../db/types"

// Guild API response schema (for GET, POST, PATCH responses)
export const GuildResponseSchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as GuildTableId),
        name: z.string(), // must be unique (enforced in service)
        admin_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        created_at: z.string().datetime(),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            name: "Guild Name",
            admin_id: 2,
            created_at: "2025-04-25T19:00:00.000Z",
        },
    })

// Guild query schema (for GET /guilds with optional filters)
export const GuildQuerySchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as GuildTableId)
            .optional(),
        name: z.string().optional(),
        admin_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId)
            .optional(),
    })
    .strict()
    .refine((data) => data.id !== undefined || data.name !== undefined || data.admin_id !== undefined, {
        message: "At least one filter (id, name, or admin_id) must be provided",
    })
    .openapi({
        example: {
            id: 1,
            name: "Guild Name",
            admin_id: 2,
        },
    })

// Guild creation request schema (for POST /guilds)
export const GuildCreateRequestSchema = z
    .object({
        name: z.string(), // must be unique (enforced in service)
        admin_wallet: z
            .string()
            .refine(isHex)
            .transform((val) => val as Address),
    })
    .strict()
    .openapi({
        example: {
            name: "Guild Name",
            admin_wallet: "0x1111111111111111111111111111111111111111",
        },
    })

// Guild update request schema (for PATCH /guilds/:id)
export const GuildUpdateRequestSchema = z
    .object({
        name: z.string().optional(), // must be unique (enforced in service)
    })
    .strict()
    .refine((data) => data.name !== undefined, { message: "Name must be provided to update a guild" })
    .openapi({
        example: {
            name: "New Guild Name",
        },
    })

// Guild delete request schema (for DELETE /guilds/:id)
export const GuildDeleteRequestSchema = z
    .object({
        id: z
            .number()
            .int()
            .openapi({ example: 1 })
            .transform((val) => val as GuildTableId),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
        },
    })
