import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { walletPermissionUpdate, watchAssetUpdate, chainUpdate } from "../../dtos"
import { isProduction } from "../../utils/isProduction"

export const inputSchema: z.ZodDiscriminatedUnion<"type", [typeof walletPermissionUpdate, typeof watchAssetUpdate, typeof chainUpdate]> =
    z.discriminatedUnion("type", [walletPermissionUpdate, watchAssetUpdate, chainUpdate])

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
