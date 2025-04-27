import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { SUBMIT_SUCCESS } from "#lib/interfaces/boop_submit"
import { isProduction } from "#lib/utils/isProduction"
import { isHexString } from "#lib/utils/zod/refines/isHexString"
import { inputSchema } from "#lib/validation/schemas/boop"

const outputSchema = z.object({
    status: z.string().openapi({ example: SubmitSuccess }),
    hash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0xa972fee74164415894187e2bdc820b38d3cca7786aa58db903b6bce7c5b535d7" }),
})

export const description = describeRoute({
    validateResponse: !isProduction,
    description: "Submits Boop",
    responses: {
        200: {
            description: "Successful TX submission",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("json", inputSchema)
