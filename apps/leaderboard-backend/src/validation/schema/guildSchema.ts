import { z } from "@hono/zod-openapi"
import type { GuildTableId, UserTableId } from "../../db/types"

// Guild API response schema (for GET, POST, PATCH responses)
export const GuildResponseSchema = z
    .object({
        id: z
            .number()
            .int()
            .openapi({ example: 1 })
            .transform((val) => val as GuildTableId),
        name: z.string().openapi({ example: "Guild Name" }),
        admin_id: z
            .number()
            .int()
            .openapi({ example: 2 })
            .transform((val) => val as UserTableId),
        created_at: z.string().datetime().openapi({ example: "2025-04-25T19:00:00.000Z" }),
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

// Guild creation request schema (for POST /guilds)
import type { Address } from "@happy.tech/common"
// ...
export const GuildCreateRequestSchema = z
    .object({
        name: z.string().min(1).openapi({ example: "Guild Name" }), // must be unique (enforced in service)
        admin_wallet: z
            .string()
            .openapi({ example: "0x1111111111111111111111111111111111111111" }) as unknown as z.ZodType<Address>,
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
        name: z.string().min(1).openapi({ example: "New Guild Name" }).optional(), // must be unique (enforced in service)
    })
    .strict()
    .refine((data) => data.name !== undefined, { message: "Name must be provided to update a guild" })
    .openapi({
        example: {
            name: "New Guild Name",
        },
    })

// Guild query schema (for GET /guilds with optional filters)
export const GuildQuerySchema = z
    .object({
        id: z.number().int().openapi({ example: 1 }).optional(),
        name: z.string().openapi({ example: "Guild Name" }).optional(),
        admin_id: z.number().int().openapi({ example: 2 }).optional(),
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
