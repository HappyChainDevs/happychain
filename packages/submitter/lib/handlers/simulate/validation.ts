import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { Onchain } from "#lib/types"
import { SubmitterError } from "#lib/types"
import { CallStatus } from "#lib/types"
import { isProduction } from "#lib/utils/isProduction"
import { inputSchema } from "#lib/utils/validation/boop"
import { isHexString } from "#lib/utils/validation/isHexString"

export const simulateOutputSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.enum([Onchain.Success]).openapi({ example: Onchain.Success }),
        maxFeePerGas: z.string().openapi({ example: (1_200_000_000).toString() }),
        submitterFee: z.string().openapi({ example: (100).toString() }),
        gas: z.number().openapi({ example: 25_000_000 }),
        validateGas: z.number().openapi({ example: 25_000_000 }),
        validatePaymentGas: z.number().openapi({ example: 25_000_000 }),
        executeGas: z.number().openapi({ example: 25_000_000 }),
        validityUnknownDuringSimulation: z.boolean().openapi({}),
        paymentValidityUnknownDuringSimulation: z.boolean().openapi({}),
        futureNonceDuringSimulation: z.boolean().openapi({}),
        feeTooLowDuringSimulation: z.boolean().openapi({}),
        callStatus: z.nativeEnum(CallStatus),
        revertData: z.string().refine(isHexString),
    }),
    z.object({
        status: z.enum([SubmitterError.UnexpectedError, Onchain.UnexpectedReverted]),
    }),
])

export const simulateDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Simulates the supplied Boop",
    responses: {
        200: {
            description: "Successful simulation",
            content: {
                "application/json": {
                    schema: resolver(simulateOutputSchema),
                },
            },
        },
    },
})
export const simulateValidation = zv("json", inputSchema.strict())
