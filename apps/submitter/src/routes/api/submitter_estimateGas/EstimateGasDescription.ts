import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { EstimateGasOutputSchema } from "./EstimateGasOutputSchema"

export const estimateGasDescription = describeRoute({
    description: "Estimate gas for the supplied HappyTx",
    responses: {
        200: {
            description: "Successful gas estimation",
            content: {
                "application/json": {
                    schema: resolver(EstimateGasOutputSchema),
                },
            },
        },

        422: {
            description: "Unprocessable Content",
            content: {
                "application/json": {
                    schema: resolver(EstimateGasOutputSchema),
                },
            },
        },
    },
})
