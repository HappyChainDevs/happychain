import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { isProduction } from "../../utils/isProduction"
import { isUUID } from "../../utils/isUUID"

export const deleteConfigSchema = z
    .object({
        id: z.string().refine(isUUID).openapi({ example: "78b7d642-e851-4f0f-9cd6-a47c6c2a572a" }),
    })
    .strict()

export const inputSchema = deleteConfigSchema

export const outputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
})

export const deleteConfigDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Delete config",
    responses: {
        200: {
            description: "Config deleted",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})

export const deleteConfigValidation = zv("param", inputSchema)
