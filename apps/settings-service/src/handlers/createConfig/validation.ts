import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { walletPermission } from "../../dtos"
import { isProduction } from "../../utils/isProduction"

export const inputSchema = z.discriminatedUnion("type", [walletPermission])

export const outputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
})

export const createConfigDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Create a new config",
    responses: {
        201: {
            description: "Config created",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})

export const createConfigValidation = zv("json", inputSchema)
