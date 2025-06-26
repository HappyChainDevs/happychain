import { isAddress } from "@happy.tech/common"
import { describeRoute } from "hono-openapi"
import { validator as zv } from "hono-openapi/zod"
import { checksum } from "ox/Address"
import { z } from "zod"
import { isProduction } from "../../utils/isProduction"

export const subscribeSchema = z
    .object({
        user: z.string().refine(isAddress).transform(checksum).openapi({
            example: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            type: "string",
        }),
    })
    .strict()

export const inputSchema = subscribeSchema

export const subscribeDescription = describeRoute({
    validateResponse: !isProduction,
    description: "Subscribe to config updates",
})

export const subscribeValidation = zv("query", inputSchema)
