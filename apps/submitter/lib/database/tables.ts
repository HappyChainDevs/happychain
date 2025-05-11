import type { DB } from "./generated"

/** Table names */
export const Tables = {
    Boops: "boops",
    Receipts: "receipts",
    EvmReceipts: "evm_receipts",
} as const satisfies { [_: string]: keyof DB }
