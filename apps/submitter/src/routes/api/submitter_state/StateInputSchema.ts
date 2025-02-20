import { validator as zv } from "hono-openapi/zod"
import { z } from "zod"

export const StateInputSchema = z
    .object({
        hash: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")),
    })
    .openapi({
        example: {
            hash: "0xcc6d027a64433519667654ee0ad9a87117c36eb07d5e75100f7b37286553c664",
        },
    })

export const stateInputParams = zv("param", StateInputSchema)
