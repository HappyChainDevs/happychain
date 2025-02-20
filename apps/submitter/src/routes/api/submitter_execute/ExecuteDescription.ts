import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { ExecuteOutputSchema } from "./ExecuteOutputSchema"

export const executeDescription = describeRoute({
    description: "Estimate gas for the supplied HappyTx",
    responses: {
        200: {
            description: "Successful gas estimation",
            content: {
                "application/json": {
                    schema: resolver(ExecuteOutputSchema),
                },
            },
        },

        422: {
            description: "Unprocessable Content",
            content: {
                "application/json": {
                    // TODO: error schema
                    schema: resolver(ExecuteOutputSchema),
                },
            },
        },
    },
})
