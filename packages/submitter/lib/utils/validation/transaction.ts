import { z } from "zod"
import { isAddress } from "@happy.tech/common"
import { isHexString } from "#lib/utils/validation/isHexString"

export const transactionSchema = z.object({
    address: z
        .string()
        .refine(isAddress)
        // .transform(checksum) // transform breaks when used as an outputSchema
        .openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
    blockHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    blockNumber: z.string().openapi({ example: "12345" }),
    blockTimestamp: z.string().openapi({ example: Date.now().toString() }),
    data: z.string().openapi({ example: "0x" }),
    logIndex: z.number().openapi({ example: 0 }),
    removed: z.boolean().openapi({ example: false }),
    topics: z.string().array().openapi({ example: [] }),
    transactionHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    transactionIndex: z.number().openapi({ example: 0 }),
})
