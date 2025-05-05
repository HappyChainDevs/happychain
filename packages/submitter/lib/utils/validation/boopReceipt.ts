import { isAddress } from "@happy.tech/common"
import { z } from "zod"
import { env } from "#lib/env"
import { Onchain, TransactionType } from "#lib/types"
import { isHexString } from "#lib/utils/validation/isHexString"

const logSchema = z.object({
    address: z.string().refine(isAddress).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
    blockHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    blockNumber: z.string().openapi({ example: "12345" }),
    blockTimestamp: z.string().optional().openapi({ example: Date.now().toString() }),
    // yeee
    data: z.string().openapi({ example: "0x" }),
    logIndex: z.number().openapi({ example: 0 }),
    removed: z.boolean().openapi({ example: false }),
    topics: z.string().array().openapi({ example: [] }),
    transactionHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    transactionIndex: z.number().openapi({ example: 0 }),
})

const receiptSchema = z.object({
    blobGasPrice: z.union([z.string(), z.undefined()]).openapi({ example: "12345" }),
    blobGasUsed: z.union([z.string(), z.undefined()]).openapi({ example: "12345" }),
    blockHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    blockNumber: z.string(),
    contractAddress: z.null(),
    cumulativeGasUsed: z.string(),
    effectiveGasPrice: z.string(),
    from: z.string().refine(isAddress).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
    gasUsed: z.string(),
    logs: z.array(logSchema),
    logsBloom: z.string().refine(isHexString).openapi({ example: "0x" }),
    root: z.union([z.string(), z.undefined()]).openapi({ example: undefined }),
    status: z.string().openapi({ example: "success" }),
    to: z.string().refine(isAddress).openapi({ example: env.DEPLOYMENT_ENTRYPOINT }),
    transactionHash: z.string().refine(isHexString).openapi({ example: "0x" }),
    transactionIndex: z.number().openapi({ example: 0 }),
    type: z.string().openapi({ example: TransactionType.EIP1559 }),
})

export const boopReceiptSchema = z.object({
    boopHash: z.string().refine(isHexString).openapi({ example: "" }),
    account: z.string().refine(isAddress).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
    nonceTrack: z.string().openapi({ example: "69" }),
    nonceValue: z.string().openapi({ example: "420" }),
    entryPoint: z.string().refine(isAddress).openapi({ example: "" }),
    status: z.string().openapi({ example: Onchain.Success }),
    logs: z.array(logSchema).openapi({ example: [] }),
    revertData: z.string().openapi({ example: "0x" }),
    gasUsed: z.string().openapi({ example: "0" }),
    gasCost: z.string().openapi({ example: "0" }),
    txReceipt: receiptSchema,
})
