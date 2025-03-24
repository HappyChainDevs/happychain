import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import env from "#src/env"
import { StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { isHexString } from "#src/utils/zod/refines/isHexString"
import { happyTxStateSchema } from "#src/validation/schemas/happyTxState"

export const inputSchema = z.object({
    hash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0xd7ebadc747305fa2ad180a8666724d71ff5936787746b456cdb976b5c9061fbc" }),
})

export const outputSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.literal(StateRequestStatus.Success),
        state: happyTxStateSchema,
    }),
    z.object({
        status: z.literal(StateRequestStatus.UnknownHappyTx),
    }),
])

export const description = describeRoute({
    validateResponse: env.NODE_ENV !== "production",
    description: "Retrieve state by HappyTxHash",
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
export const validation = zv("param", inputSchema)
