import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { StateOutputSchema } from "./StateOutputSchema"

export const stateDescription = describeRoute({
    description: "Fetch State Details",
    responses: {
        200: {
            description: "State Found",
            content: {
                "application/json": {
                    schema: resolver(StateOutputSchema),
                },
            },
        },

        422: {
            description: "Unprocessable Content",
            content: {
                "application/json": {
                    // TODO: error schema
                    schema: resolver(StateOutputSchema),
                },
            },
        },
    },
})
