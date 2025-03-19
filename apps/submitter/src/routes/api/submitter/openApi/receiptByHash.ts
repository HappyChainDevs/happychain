import { describeRoute } from "hono-openapi"
import { resolver, validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import env from "#src/env"
import { outputSchema, inputSchema as paramSchema } from "./stateByHash"

const querySchema = z.object({
    timeout: z.coerce.number().min(0).max(30_000).default(2_500).openapi({ example: 500 }),
})

export const description = describeRoute({
    validateResponse: env.NODE_ENV !== "production",
    description: "Retrieve state by HappyTxHash, waiting if necessary",
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
