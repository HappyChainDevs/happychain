import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { getAddress } from "viem"
import { z } from "zod"
import env from "#lib/env"
import { SubmitSuccess } from "#lib/tmp/interface/submitter_submit"
import { isProduction } from "#lib/utils/isProduction"
import { isAddress } from "#lib/utils/zod/refines/isAddress"
import { isHexString } from "#lib/utils/zod/refines/isHexString"
import { happyTxInputSchema } from "#lib/validation/schemas/happyTx"

export const inputSchema = z.object({
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint: z
        .string()
        .refine(isAddress)
        .optional()
        .default(env.DEPLOYMENT_ENTRYPOINT)
        .transform((a) => getAddress(a)),

    /** HappyTx to execute. */
    tx: happyTxInputSchema,
})

const outputSchema = z.object({
    status: z.string().openapi({ example: SubmitSuccess }),
    hash: z
        .string()
        .refine(isHexString)
        .openapi({ example: "0xa972fee74164415894187e2bdc820b38d3cca7786aa58db903b6bce7c5b535d7" }),
})

export const description = describeRoute({
    validateResponse: !isProduction,
    description: "Submits HappyTX",
    responses: {
        200: {
            description: "Successful TX submission",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("json", inputSchema)
