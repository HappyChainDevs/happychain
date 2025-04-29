import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { checksum } from "ox/Address"
import { z } from "zod"
import { SubmitterError } from "#lib/types"
import { isProduction } from "#lib/utils/isProduction"
import { isAddress } from "#lib/utils/validation/isAddress"
import { isHexString } from "#lib/utils/validation/isHexString"
import { CreateAccount } from "./types"

const inputSchema = z.object({
    owner: z
        .string()
        .refine(isAddress)
        .transform(checksum)
        .openapi({ example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" }),
    salt: z
        .string()
        .max(66)
        .refine(isHexString)
        // convert to bytes32
        .transform((str) => `0x${str.slice(2).padStart(64, "0")}` as `0x${string}`)
        .openapi({ example: "0x1" }),
})

const outputSchema = inputSchema.merge(
    z.object({
        status: z
            .union([z.nativeEnum(CreateAccount), z.nativeEnum(SubmitterError)])
            .openapi({ example: CreateAccount.Success }),
        address: z
            .string()
            .refine(isHexString)
            .optional()
            .openapi({ example: "0x5b3064DD8C5A33e6F7Fb814FdCdb0c249bf57Ad2" }),
        description: z.string().optional().openapi({ example: "Account creation failed onchain" }),
    }),
)

export const description = describeRoute({
    // Experimental option. Disable in production, but useful in development
    validateResponse: !isProduction,
    description: "Create a new account",
    hide: isProduction,
    responses: {
        200: {
            description: "Successfully created an account",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})

export const validation = zv("json", inputSchema)
