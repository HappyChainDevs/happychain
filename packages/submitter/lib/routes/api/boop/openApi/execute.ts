import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { Onchain, OnchainFail, Success } from "#lib/interfaces/Onchain"
import { SubmitterError } from "#lib/interfaces/SubmitterError"
import { Execute } from "#lib/interfaces/boop_execute"
import { isProduction } from "#lib/utils/isProduction"
import { isHexString } from "#lib/utils/zod/refines/isHexString"
import { inputSchema } from "#lib/validation/schemas/boop"
import { boopReceiptSchema } from "#lib/validation/schemas/boopReceipt"

const outputSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.enum([Success]).openapi({ example: Execute.Success }),
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

export const description = describeRoute({
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
export const validation = zv("json", inputSchema)
