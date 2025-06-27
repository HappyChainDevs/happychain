import { isAddress } from "@happy.tech/common"
import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { checksum } from "ox/Address"
import { z } from "zod"
import { walletPermission, watchAsset } from "../../dtos"
import { isProduction } from "../../utils/isProduction"

export const listConfigSchema = z
    .object({
        user: z.string().refine(isAddress).transform(checksum).openapi({
            example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            type: "string",
        }),
        lastUpdated: z
            .string()
            .optional()
            .transform((val) => (val ? Number.parseInt(val) : undefined))
            .openapi({
                example: "1715702400",
                type: "number",
            }),
        type: z.enum(["WalletPermissions", "ERC20", "Chain"]).optional(),
    })
    .strict()

export const inputSchema = listConfigSchema

export const outputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: z.array(z.discriminatedUnion("type", [walletPermission, watchAsset])),
})

export const listConfigDescription = describeRoute({
    validateResponse: !isProduction,
    description: "List configs",
    responses: {
        200: {
            description: "Configs listed",
            content: {
                "application/json": {
                    schema: resolver(outputSchema),
                },
            },
        },
    },
})

export const listConfigValidation = zv("query", inputSchema)
