import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import env from "#lib/env"
import { isAddress } from "#lib/utils/zod/refines/isAddress"
import { pendingTxSchema } from "#lib/validation/schemas/pendingTx"

const inputSchema = z.object({
    account: z.string().refine(isAddress).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
})

const outputSchema = z.object({
    pending: z.array(pendingTxSchema).openapi({ example: [] }),
})

export const description = describeRoute({
    validateResponse: env.NODE_ENV !== "production",
    description: "Retrieve pending happy transactions for Account",
    responses: {
        200: {
            description: "Pending HappyTransactions",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("param", inputSchema)
