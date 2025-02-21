import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { isHexString } from "#src/utils/zod/refines/isHexString"
import { inputSchema } from "./execute"

export { inputSchema }

const outputSchema = z
    .object({
        status: z.string(),
        hash: z.string().refine(isHexString),
    })
    .openapi({
        example: {
            status: EntryPointStatus.Success,
            hash: "0xa972fee74164415894187e2bdc820b38d3cca7786aa58db903b6bce7c5b535d7",
        },
    })

export const description = describeRoute({
    description: "Submits HappyTX",
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
