/**
 * This maps db columns to specific TS types. Note This of course only applies to the typescript
 * generated types, not the actual database. Mainly to be used as a convenience, so columns such as
 * transaction hash are not just strings, but `0x${string}`, and gas values can be `bigint` despite
 * being stored as `text` in the database (see SerializerPlugin for more details on this)
 */
export const overrides = {
    columns: {
        "boop_receipts.gasCost": "bigint",
        "boop_receipts.gasUsed": "bigint",
        "boop_receipts.boopHash": "`0x${string}`",
        "boop_receipts.nonceTrack": "bigint",
        "boop_receipts.nonceValue": "bigint",
        "boop_receipts.revertData": "`0x${string}`",
        "boop_receipts.transactionHash": "`0x${string}`",
        "boop_states.included": "boolean",
        "boop_transactions.account": "`0x${string}`",
        "boop_transactions.callData": "`0x${string}`",
        "boop_transactions.dest": "`0x${string}`",
        "boop_transactions.entryPoint": "`0x${string}`",
        "boop_transactions.executeGasLimit": "bigint",
        "boop_transactions.extraData": "`0x${string}`",
        "boop_transactions.gasLimit": "bigint",
        "boop_transactions.validateGasLimit": "bigint",
        "boop_transactions.validatePaymentGasLimit": "bigint",
        "boop_transactions.boopHash": "`0x${string}`",
        "boop_transactions.maxFeePerGas": "bigint",
        "boop_transactions.nonceTrack": "bigint",
        "boop_transactions.nonceValue": "bigint",
        "boop_transactions.payer": "`0x${string}`",
        "boop_transactions.submitterFee": "bigint",
        "boop_transactions.validatorData": "`0x${string}`",
        "boop_transactions.value": "bigint",
    },
}
