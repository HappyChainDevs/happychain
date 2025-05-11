import type { Address, Bytes, Int256, UInt32, UInt256 } from "@happy.tech/common"
import { Tables } from "./tables"

/**
 * This maps db columns to specific TS types. Note This of course only applies to the typescript
 * generated types, not the actual database. Mainly to be used as a convenience, so columns such as
 * transaction hash are not just strings, but `0x${string}`, and gas values can be `bigint` despite
 * being stored as `text` in the database (see SerializerPlugin for more details on this)
 */
export const overrides = {
    columns: {
        [`${Tables.Receipts}.boopHash`]: "`0x${string}`",
        [`${Tables.Receipts}.gasCost`]: "bigint",
        [`${Tables.Receipts}.gasUsed`]: "bigint",
        [`${Tables.Receipts}.nonceTrack`]: "bigint",
        [`${Tables.Receipts}.nonceValue`]: "bigint",
        [`${Tables.Receipts}.revertData`]: "`0x${string}`",
        [`${Tables.Receipts}.txHash`]: "`0x${string}`",

        [`${Tables.States}.included`]: "boolean",

        [`${Tables.Boops}.entryPoint`]: "`0x${string}`",
        [`${Tables.Boops}.boopHash`]: "`0x${string}`",
        [`${Tables.Boops}.account`]: "`0x${string}`",
        [`${Tables.Boops}.dest`]: "`0x${string}`",
        [`${Tables.Boops}.payer`]: "`0x${string}`",
        [`${Tables.Boops}.value`]: "bigint",
        [`${Tables.Boops}.nonceTrack`]: "bigint",
        [`${Tables.Boops}.nonceValue`]: "bigint",
        [`${Tables.Boops}.maxFeePerGas`]: "bigint",
        [`${Tables.Boops}.submitterFee`]: "bigint",
        [`${Tables.Boops}.callData`]: "`0x${string}`",
        [`${Tables.Boops}.validatorData`]: "`0x${string}`",
        [`${Tables.Boops}.extraData`]: "`0x${string}`",
    },
}
