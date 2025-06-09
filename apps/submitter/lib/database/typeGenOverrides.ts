/**
 * This maps db columns to specific TS types. Note This of course only applies to the typescript
 * generated types, not the actual database. Mainly to be used as a convenience, so columns such as
 * transaction hash are not just strings, but Hash`, and gas values can be `bigint` despite
 * being stored as `text` in the database (see SerializerPlugin for more details on bigint serialization).
 */
export const overrides = {
    columns: {
        "boops.entryPoint": "Address",
        "boops.boopHash": "Hash",
        "boops.account": "Address",
        "boops.dest": "Address",
        "boops.payer": "Address",
        "boops.value": "bigint",
        "boops.nonceTrack": "bigint",
        "boops.nonceValue": "bigint",
        "boops.maxFeePerGas": "bigint",
        "boops.submitterFee": "bigint",
        "boops.callData": "Hex",
        "boops.validatorData": "Hex",
        "boops.extraData": "Hex",

        "receipts.boopHash": "Hash",
        "receipts.gasCost": "bigint",
        "receipts.nonceTrack": "bigint",
        "receipts.nonceValue": "bigint",
        "receipts.revertData": "Hex",
        "receipts.evmTxHash": "Hash",
        "receipts.blockHash": "Hash",
        "receipts.blockNumber": "bigint",
        "receipts.gasPrice": "bigint",
    },
}
