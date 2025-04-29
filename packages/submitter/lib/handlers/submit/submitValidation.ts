import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { Submit } from "#lib/handlers/submit/types"
import { OnchainFail, Success } from "#lib/types"
import { SubmitterError } from "#lib/types"
import { isProduction } from "#lib/utils/isProduction"
import { inputSchema } from "#lib/utils/validation/boop"
import { isHexString } from "#lib/utils/validation/isHexString"

const outputSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.enum([Success]).openapi({ example: Submit.Success }),
        hash: z
            .string()
            .refine(isHexString)
            .openapi({ example: "0xa972fee74164415894187e2bdc820b38d3cca7786aa58db903b6bce7c5b535d7" }),
    }),
    z.object({
        status: z.nativeEnum(OnchainFail),
        stage: z.literal("simulate"),
        revertData: z.string().refine(isHexString).optional(),
        description: z.string().optional(),
    }),
    z.object({
        status: z.nativeEnum(SubmitterError),
        stage: z.enum(["simulate", "submit"]),
        description: z.string().optional(),
    }),
])

export const description = describeRoute({
    validateResponse: !isProduction,
    description: "Submits Boop",
    responses: {
        200: {
            description: "Boop successfully submitted",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})
export const validation = zv("json", inputSchema)
