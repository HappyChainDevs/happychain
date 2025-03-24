import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { deployment } from "#src/deployments"
import env from "#src/env"
import { isAddress } from "#src/utils/zod/refines/isAddress"
import { toBigInt } from "#src/utils/zod/transforms/toBigInt"
import { happyTxInputSchema } from "#src/validation/schemas/happyTx"
import { simulationResultSchema } from "#src/validation/schemas/simulationResult"

const inputSchema = z.object({
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint: z.string().refine(isAddress).optional().default(deployment.HappyEntryPoint),

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

const outputSchema = z.object({
    simulationResult: simulationResultSchema,
    maxFeePerGas: z.string().openapi({ example: "1200000000" }),
    submitterFee: z.string().openapi({ example: "100" }),
    gasLimit: z.string().openapi({ example: "4000000000" }),
    executeGasLimit: z.string().openapi({ example: "4000000000" }),
    status: z.string().openapi({ example: "success" }),
})

export const description = describeRoute({
    validateResponse: env.NODE_ENV !== "production",
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
