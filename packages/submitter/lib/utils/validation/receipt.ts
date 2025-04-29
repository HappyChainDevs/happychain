import { z } from "zod"
import { env } from "#lib/env"
import { TransactionTypeName } from "#lib/types"
import { isAddress } from "#lib/utils/validation/isAddress"
import { isHexString } from "#lib/utils/validation/isHexString"
import { transactionSchema } from "./transaction"

export const receiptSchema = z.object({
    blobGasPrice: z.union([z.string(), z.undefined()]).openapi({ example: "12345" }),
    blobGasUsed: z.union([z.string(), z.undefined()]).openapi({ example: "12345" }),
    blockHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    blockNumber: z.string(),
    contractAddress: z.null(),
    cumulativeGasUsed: z.string(),
    effectiveGasPrice: z.string(),
    from: z.string().refine(isAddress).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
    gasUsed: z.string(),
    logs: z.array(transactionSchema),
    logsBloom: z.string().refine(isHexString).openapi({ example: "0x" }),
    root: z.union([z.string(), z.undefined()]).openapi({ example: undefined }),
    status: z.string().openapi({ example: "success" }),
    to: z.string().refine(isAddress).openapi({ example: env.DEPLOYMENT_ENTRYPOINT }),
    transactionHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    transactionIndex: z.number().openapi({ example: 0 }),
    type: z.string().openapi({ example: TransactionTypeName.EIP1559 }),
})
