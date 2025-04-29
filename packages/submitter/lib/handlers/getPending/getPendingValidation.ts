import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { checksum } from "ox/Address"
import { z } from "zod"
import { isProduction } from "#lib/utils/isProduction"
import { isAddress } from "#lib/utils/validation/isAddress"
import { pendingTxSchema } from "#lib/utils/validation/pendingTx"

const inputSchema = z.object({
    account: z
        .string()
        .refine(isAddress)
        .transform(checksum)
        .openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
})

const outputSchema = z.object({
    pending: z.array(pendingTxSchema).openapi({ example: [] }),
})

export const description = describeRoute({
    validateResponse: !isProduction,
    description: "Retrieve pending happy transactions for Account",
    responses: {
        200: {
            description: "Pending Boops",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("param", inputSchema)
