import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { ExecuteSuccess } from "#lib/tmp/interface/submitter_execute"
import { isProduction } from "#lib/utils/isProduction"
import { happyReceiptSchema } from "#lib/validation/schemas/happyReceipt"
import { inputSchema } from "./submit"

export { inputSchema }

const outputSchema = z.object({
    status: z.literal(ExecuteSuccess),
    state: z.object({
        status: z.string().openapi({ example: EntryPointStatus.Success }),
        included: z.boolean().openapi({ example: true }),
        receipt: happyReceiptSchema,
    }),
})

export const description = describeRoute({
    validateResponse: !isProduction,
    description: "Execute HappyTX",
    responses: {
        200: {
            description: "Successful TX execution",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("json", inputSchema)
