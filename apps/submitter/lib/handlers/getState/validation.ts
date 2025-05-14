import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { simulateOutputSchema } from "#lib/handlers/simulate/validation"
import { SubmitterError } from "#lib/types"
import { isProduction } from "#lib/utils/isProduction"
import { boopReceiptSchema } from "#lib/utils/validation/boopReceipt"
import { isHexString } from "#lib/utils/validation/isHexString"
import { GetState } from "./types"

export const inputSchema = z.object({
    boopHash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0xd7ebadc747305fa2ad180a8666724d71ff5936787746b456cdb976b5c9061fbc" }),
})

const getStateReceiptSchema = z.object({
    status: z.literal(GetState.Receipt).openapi({ example: GetState.Receipt }),
    receipt: boopReceiptSchema,
})

const getStateSimulatedSchema = z.object({
    status: z.literal(GetState.Simulated).openapi({ example: GetState.Simulated }),
    simulation: simulateOutputSchema,
})

const getStateErrorSchema = z.object({
    status: z.nativeEnum(SubmitterError),
    description: z.string().optional(),
})

export const outputSchema = z.discriminatedUnion("status", [
    getStateReceiptSchema,
    getStateErrorSchema,
    getStateSimulatedSchema,
])

export const getStateDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Retrieve state by BoopHash",
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
export const getStateValidation = zv("param", inputSchema.strict())
