import { describeRoute } from "hono-openapi"
import { resolver, validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { DEFAULT_RECEIPT_TIMEOUT_MS } from "#lib/data/defaults"
import { isProduction } from "#lib/utils/isProduction"
import { outputSchema, inputSchema as paramSchema } from "./stateByHash"

const querySchema = z.object({
    timeout: z.coerce.number().min(0).max(30_000).default(DEFAULT_RECEIPT_TIMEOUT_MS).openapi({ example: 500 }),
})

export const description = describeRoute({
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

export const paramValidation = zv("param", paramSchema)
export const queryValidation = zv("query", querySchema)
