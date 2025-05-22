import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { walletPermission } from "../../dtos"
import { isProduction } from "../../utils/isProduction"

export const inputSchema: z.ZodDiscriminatedUnion<"type", [typeof walletPermission]> = z.discriminatedUnion("type", [
    walletPermission,
])

export const outputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
})

export const updateConfigDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Update config",
    responses: {
        200: {
            description: "Config updated",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})

export const updateConfigValidation = zv("json", inputSchema)
