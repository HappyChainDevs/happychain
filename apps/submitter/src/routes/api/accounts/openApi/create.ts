import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"
import { isHexString } from "#src/utils/zod/isHexString"

export const description = describeRoute({
    description: "Create a new account",
    responses: {
        200: {
            description: "Successfully created an account",
            content: {
                "application/json": {
                    schema: resolver(
                        z
                            .object({ address: z.string().refine(isHexString) })
                            .openapi({ example: { address: "0x5b3064DD8C5A33e6F7Fb814FdCdb0c249bf57Ad2" } }),
                    ),
                },
            },
        },
    },
})

export const validation = zv(
    "json",
    z
        .object({
            owner: z.string().refine(isHexString),
            salt: z
                .string()
                .max(66)
                .refine(isHexString)
                // convert to bytes32
                .transform((str) => `0x${str.slice(2).padStart(64, "0")}` as `0x${string}`),
        })
        .openapi({
            example: {
                owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                salt: "0x1",
            },
        }),
)
