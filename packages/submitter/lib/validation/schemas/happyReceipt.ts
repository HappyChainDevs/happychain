import { z } from "zod"
import { EntryPointStatus } from "#lib/tmp/interface/status"
import { isAddress } from "#lib/utils/zod/refines/isAddress"
import { isHexString } from "#lib/utils/zod/refines/isHexString"
import { receiptSchema } from "./receipt"
import { transactionSchema } from "./transaction"

export const happyReceiptSchema = z.object({
    happyTxHash: z.string().refine(isHexString).openapi({ example: "" }),
    account: z.string().refine(isAddress).openapi({ example: "0xBC5F85819B9b970c956f80c1Ab5EfbE73c818eaa" }),
    nonceTrack: z.string().openapi({ example: "69" }),
    nonceValue: z.string().openapi({ example: "420" }),
    entryPoint: z.string().refine(isAddress).openapi({ example: "" }),
    status: z.string().openapi({ example: EntryPointStatus.Success }),
    logs: z.array(transactionSchema).openapi({ example: [] }),
    revertData: z.string().openapi({ example: "0x" }),
    gasUsed: z.string().openapi({ example: "0" }),
    gasCost: z.string().openapi({ example: "0" }),
    txReceipt: receiptSchema,
})
