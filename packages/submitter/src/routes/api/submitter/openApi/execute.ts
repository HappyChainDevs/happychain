import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { deployment } from "#src/deployments"
import env from "#src/env"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { ExecuteSuccess } from "#src/tmp/interface/submitter_execute"
import { isAddress } from "#src/utils/zod/refines/isAddress"
import { happyReceiptSchema } from "#src/validation/schemas/happyReceipt"
import { happyTxInputSchema } from "#src/validation/schemas/happyTx"

export const inputSchema = z.object({
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint: z.string().refine(isAddress).optional().default(deployment.HappyEntryPoint),

    /** HappyTx to execute. */
    tx: happyTxInputSchema,
})

const outputSchema = z.object({
    status: z.literal(ExecuteSuccess),
    state: z.object({
        status: z.string().openapi({ example: EntryPointStatus.Success }),
        included: z.boolean().openapi({ example: true }),
        receipt: happyReceiptSchema,
    }),
})

export const description = describeRoute({
    validateResponse: env.NODE_ENV !== "production",
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
