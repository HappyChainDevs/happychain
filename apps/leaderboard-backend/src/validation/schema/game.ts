import { z } from "@hono/zod-openapi"

export const GameSchema = z.object({
    id: z.number().int().openapi({ example: 1 }),
    name: z.string().min(1).openapi({ example: "Chess" }),
    icon_url: z.string().url().nullable().openapi({ example: "https://..." }),
    admin_id: z.number().int().openapi({ example: 42 }),
    created_at: z.string().datetime().openapi({ example: "2024-04-24T12:00:00Z" }),
    last_updated_at: z.string().datetime().openapi({ example: "2024-04-24T12:00:00Z" }),
})

export const GameCreateSchema = GameSchema.omit({ id: true })
