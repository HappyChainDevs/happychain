import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { checksum } from "ox/Address"
import { z } from "zod"
import env from "#lib/env"
import { EntryPointStatus, SubmitterErrorStatus } from "#lib/tmp/interface/status"
import { isAddress } from "#lib/utils/zod/refines/isAddress"
import { toBigInt } from "#lib/utils/zod/transforms/toBigInt"
import { happyTxInputSchema } from "#lib/validation/schemas/happyTx"
import { simulationResultSchema } from "#lib/validation/schemas/simulationResult"

const inputSchema = z.object({
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint: z.string().refine(isAddress).transform(checksum).optional().default(env.DEPLOYMENT_ENTRYPOINT),

    /**
     * HappyTx for which to estimate gas limits and fee parameters. The gas limits and fee
     * parameters are made optional.
     */
    tx: happyTxInputSchema.merge(
        z.object({
            maxFeePerGas: z.string().transform(toBigInt).openapi({ example: "1200000000" }).optional(), // UInt256 //
            submitterFee: z.string().transform(toBigInt).openapi({ example: "100" }).optional(), // Int256 //
            gasLimit: z.string().transform(toBigInt).openapi({ example: "4000000000" }).optional(), // UInt32 //
            executeGasLimit: z.string().transform(toBigInt).openapi({ example: "4000000000" }).optional(), // UInt32 //
        }),
    ),
})

const outputSchema = z.discriminatedUnion("status", [
    z.object({
        simulationResult: simulationResultSchema,
        maxFeePerGas: z.string().openapi({ example: "1200000000" }),
        submitterFee: z.string().openapi({ example: "100" }),
        gasLimit: z.string().openapi({ example: "4000000000" }),
        executeGasLimit: z.string().openapi({ example: "4000000000" }),
        status: z.enum([EntryPointStatus.Success]).openapi({ example: EntryPointStatus.Success }),
    }),
    z.object({
        status: z.enum([SubmitterErrorStatus.UnexpectedError]),
    }),
])

export const description = describeRoute({
    // validateResponse: env.NODE_ENV !== "production",
    description: "Estimate gas for the supplied HappyTx",
    responses: {
        200: {
            description: "Successful gas estimation",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("json", inputSchema)
