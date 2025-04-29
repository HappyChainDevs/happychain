import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { isProduction } from "#lib/utils/isProduction"
import { boopStateSchema } from "#lib/utils/validation/boopState"
import { isHexString } from "#lib/utils/validation/isHexString"
import { StateRequestStatus } from "./types"

export const inputSchema = z.object({
    hash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0xd7ebadc747305fa2ad180a8666724d71ff5936787746b456cdb976b5c9061fbc" }),
})

export const outputSchema = z.object({
    status: z.enum([StateRequestStatus.Success, StateRequestStatus.UnknownBoop]),
    state: boopStateSchema.optional(),
})

export const getStateDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Retrieve state by BoopHash",
    responses: {
        200: {
            description: "Successful State Retrieval",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const getStateValidation = zv("param", inputSchema)
