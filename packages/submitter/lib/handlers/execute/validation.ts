import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { Execute } from "#lib/handlers/execute"
import { OnchainFail, Success } from "#lib/types"
import { SubmitterError } from "#lib/types"
import { isProduction } from "#lib/utils/isProduction"
import { inputSchema } from "#lib/utils/validation/boop"
import { boopReceiptSchema } from "#lib/utils/validation/boopReceipt"
import { isHexString } from "#lib/utils/validation/isHexString"

const outputSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.literal(Success).openapi({ example: Execute.Success }),
        receipt: boopReceiptSchema,
    }),
    z.object({
        status: z.nativeEnum(OnchainFail),
        stage: z.enum(["simulate", "execute"]),
        revertData: z.string().refine(isHexString).optional(),
        receipt: boopReceiptSchema.optional(),
        description: z.string().optional(),
    }),
    z.object({
        status: z.nativeEnum(SubmitterError),
        stage: z.enum(["simulate", "submit", "execute"]),
        description: z.string().optional(),
    }),
])

export const executeDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Execute Boop",
    responses: {
        200: {
            description: "Boop successfully executed 👉🐈",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const executeValidation = zv("json", inputSchema)
