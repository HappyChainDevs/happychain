import type { Address } from "viem"
import { db } from "#src/database"
import type { HappyTx } from "#src/tmp/interface/HappyTx"

export async function insertHappyTransaction(entryPoint: Address, tx: HappyTx) {
    return await db
        .insertInto("happy_transactions")
        .values({
            ...tx,
            entryPoint: entryPoint,
            nonceTrack: `0x${tx.nonceTrack.toString(16)}`,
            nonceValue: `0x${tx.nonceValue.toString(16)}`,
            value: `0x${tx.value.toString(16)}`,
            maxFeePerGas: `0x${tx.maxFeePerGas.toString(16)}`,
            executeGasLimit: `0x${tx.executeGasLimit.toString(16)}`,
            gasLimit: `0x${tx.gasLimit.toString(16)}`,
            submitterFee: `0x${tx.submitterFee.toString(16)}`,
        })
        .returningAll()
        .executeTakeFirst()
}
