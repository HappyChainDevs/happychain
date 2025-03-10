import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import env from "#src/env"
import { StateRequestStatus } from "#src/tmp/interface/HappyTxState"
import { isHexString } from "#src/utils/zod/refines/isHexString"
import { happyTxStateSchema } from "#src/validation/schemas/happyTxState"

const inputSchema = z.object({
    hash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0xd7ebadc747305fa2ad180a8666724d71ff5936787746b456cdb976b5c9061fbc" }),
})

const outputSchema = z.object({
    status: z.enum([StateRequestStatus.Success, StateRequestStatus.UnknownHappyTx]),
    state: happyTxStateSchema,
})

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
