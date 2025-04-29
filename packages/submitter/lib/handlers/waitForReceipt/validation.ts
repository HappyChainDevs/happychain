import { describeRoute } from "hono-openapi"
import { resolver, validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { env } from "#lib/env"
import { isProduction } from "#lib/utils/isProduction"
import { outputSchema, inputSchema as paramSchema } from "../getState/validation"

const querySchema = z.object({
    timeout: z.coerce.number().min(0).max(30_000).default(env.RECEIPT_TIMEOUT).openapi({ example: 500 }),
})

export const waitForReceiptDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Retrieve state by BoopHash, waiting if necessary",
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

export const waitForReceiptParamValidation = zv("param", paramSchema)
export const waitForReceiptQueryValidation = zv("query", querySchema)
