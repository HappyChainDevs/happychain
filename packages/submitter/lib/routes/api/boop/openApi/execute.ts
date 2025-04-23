import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { ExecuteSuccess } from "#lib/interfaces/boop_execute"
import { EntryPointStatus } from "#lib/interfaces/status"
import { isProduction } from "#lib/utils/isProduction"
import { boopReceiptSchema } from "#lib/validation/schemas/boopReceipt"
import { inputSchema } from "./submit"

export { inputSchema }

const outputSchema = z.object({
    status: z.literal(ExecuteSuccess),
    state: z.object({
        status: z.string().openapi({ example: EntryPointStatus.Success }),
        included: z.boolean().openapi({ example: true }),
        receipt: boopReceiptSchema,
    }),
})

export const description = describeRoute({
    validateResponse: !isProduction,
    description: "Execute Boop",
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
