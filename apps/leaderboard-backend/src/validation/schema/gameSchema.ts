import { z } from "@hono/zod-openapi"
import type { GameTableId, UserTableId } from "../../db/types"

// Game API response schema (for GET, POST responses)
export const GameResponseSchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as GameTableId),
        name: z.string(), // must be unique (enforced in service)
        admin_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        icon_url: z.string().url(),
        created_at: z.string().datetime(),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
            name: "Prince of Persia",
            admin_id: 117,
            icon_url: "http://path_to_image_url.png",
            created_at: "2023-01-01T00:00:00.000Z",
        },
    })

// Game query schema for GET /games (query params)
export const GameQuerySchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as GameTableId),
        name: z.string(),
        admin_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
    })
    .strict()
    .refine((data) => data.id !== undefined || data.name !== undefined || data.admin_id !== undefined, {
        message: "At least one filter (id, name, or admin_id) must be provided",
    })
    .openapi({
        example: {
            id: 1,
            name: "Prince of Persia",
            admin_id: 117,
        },
    })

// Game creation request schema (for POST /games)
export const GameCreateRequestSchema = z
    .object({
        name: z.string().openapi({ example: "Guild Name" }),
        admin_id: z
            .number()
            .int()
            .transform((val) => val as UserTableId),
        icon_url: z.string().url(),
    })
    .strict()
    .openapi({
        example: {
            name: "Prince of Persia",
            admin_id: 117,
            icon_url: "http://path_to_image_url.png",
        },
    })

// Game update request schema (for PATCH /games/:id)
export const GameUpdateRequestSchema = z
    .object({
        name: z.string().optional(),
        icon_url: z.string().url().optional(),
    })
    .strict()
    .refine((data) => data.name !== undefined || data.icon_url !== undefined, {
        message: "At least one of name or icon_url must be provided",
    })
    .openapi({
        example: {
            name: "Assassin's Creed",
            icon_url: "http://path_to_image_url.png",
        },
    })

// Game delete request schema (for DELETE /games/:id)
export const GameDeleteRequestSchema = z
    .object({
        id: z
            .number()
            .int()
            .transform((val) => val as GameTableId),
    })
    .strict()
    .openapi({
        example: {
            id: 1,
        },
    })
