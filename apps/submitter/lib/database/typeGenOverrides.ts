import { Tables } from "./tables"

/**
 * This maps db columns to specific TS types. Note This of course only applies to the typescript
 * generated types, not the actual database. Mainly to be used as a convenience, so columns such as
 * transaction hash are not just strings, but `0x${string}`, and gas values can be `bigint` despite
 * being stored as `text` in the database (see SerializerPlugin for more details on this)
 */
export const overrides = {
    columns: {
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

        [`${Tables.Receipts}.boopHash`]: "`0x${string}`",
        [`${Tables.Receipts}.gasCost`]: "bigint",
        // [`${Tables.Receipts}.gasUsed`]: "bigint",
        [`${Tables.Receipts}.nonceTrack`]: "bigint",
        [`${Tables.Receipts}.nonceValue`]: "bigint",
        [`${Tables.Receipts}.revertData`]: "`0x${string}`",
        [`${Tables.Receipts}.txHash`]: "`0x${string}`",

        [`${Tables.EvmReceipts}.boopHash`]: "`0x${string}`",
        [`${Tables.EvmReceipts}.transactionHash`]: "`0x${string}`",
        [`${Tables.EvmReceipts}.status`]: "string",
        [`${Tables.EvmReceipts}.from`]: "`0x${string}`",
        [`${Tables.EvmReceipts}.to`]: "`0x${string}`",
        [`${Tables.EvmReceipts}.blockHash`]: "`0x${string}`",
        [`${Tables.EvmReceipts}.blockNumber`]: "bigint",
        [`${Tables.EvmReceipts}.effectiveGasPrice`]: "bigint",
        [`${Tables.EvmReceipts}.gasUsed`]: "bigint",
    },
}
