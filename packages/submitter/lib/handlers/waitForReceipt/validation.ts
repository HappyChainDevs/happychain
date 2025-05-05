import { describeRoute } from "hono-openapi"
import { resolver, validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { env } from "#lib/env"
import { GetState } from "#lib/handlers/getState"
import { simulateOutputSchema } from "#lib/handlers/simulate/validation"
import { WaitForReceipt } from "#lib/handlers/waitForReceipt/types"
import { SubmitterError } from "#lib/types"
import { isProduction } from "#lib/utils/isProduction"
import { boopReceiptSchema } from "#lib/utils/validation/boopReceipt"
import { isHexString } from "#lib/utils/validation/isHexString"

export const paramSchema = z.object({
    hash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0xd7ebadc747305fa2ad180a8666724d71ff5936787746b456cdb976b5c9061fbc" }),
})

const querySchema = z.object({
    timeout: z.coerce.number().min(0).max(30_000).default(env.RECEIPT_TIMEOUT).openapi({ example: 500 }),
})

const waitForReceiptSuccessSchema = z.object({
    status: z.literal(WaitForReceipt.Success).openapi({ example: WaitForReceipt.Success }),
    receipt: boopReceiptSchema,
})

const waitForReceiptErrorSchema = z.object({
    status: z.nativeEnum(SubmitterError).openapi({ example: SubmitterError.ReceiptTimeout }),
    simulation: simulateOutputSchema.optional(),
    description: z.string().optional(),
})

const waitForReceiptUnknownSchema = z.object({
    status: z.literal(WaitForReceipt.UnknownBoop).openapi({ example: WaitForReceipt.UnknownBoop }),
})

export const outputSchema = z.discriminatedUnion("status", [
    waitForReceiptSuccessSchema,
    waitForReceiptErrorSchema,
    waitForReceiptUnknownSchema,
])

export const waitForReceiptDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Retrieve state by BoopHash, waiting if necessary",
    responses: {
        200: {
            description: "Successful State Retrieval",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})

export const waitForReceiptParamValidation = zv("param", paramSchema)
export const waitForReceiptQueryValidation = zv("query", querySchema)
