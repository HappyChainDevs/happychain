import { z } from "@hono/zod-openapi"
import { resolver } from "hono-openapi/zod"

/**
 * Standard success response wrapper
 * All successful API responses should use this wrapper with their specific data schema
 */
export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => {
    return z
        .object({
            ok: z.literal(true),
            data: dataSchema,
        })
        .strict()
}

/**
 * Standard error response schema
 * All API error responses should use this schema
 */
export const ErrorResponseSchema = z
    .object({
        ok: z.literal(false),
        error: z.string(),
    })
    .strict()
    .openapi({
        example: {
            ok: false,
            error: "An error occurred",
        },
    })

export const ErrorResponseSchemaObj = resolver(ErrorResponseSchema)
