import type { DB } from "./generated"

/** Table names */
export const Tables = {
    Boops: "boops",
    States: "states",
    Receipts: "receipts",
} as const satisfies { [_: string]: keyof DB }

/** Pass this values as the value of `id` primary keys to let kysely auto-generate their values. */
export const auto = null as unknown as number
