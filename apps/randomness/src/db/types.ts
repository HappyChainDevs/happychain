import { type Hex, type UUID, bigIntToZeroPadded } from "@happy.tech/common"
import type { DrandStatus } from "../Drand"
import { Randomness, type RandomnessStatus } from "../Randomness"
import { DIGITS_MAX_UINT256 } from "../constants"

// Values are stored as strings because they can be large numbers bigger than the max value of an SQLite integer
export interface RandomnessRow {
    blockNumber: string
    value: string
    hashedValue: Hex
    commitmentTransactionIntentId: UUID | undefined
    revealTransactionIntentId: UUID | undefined
    status: RandomnessStatus
}

export interface DrandRow {
    // We store the round as a string because it can be a large number bigger than the max value of an SQLite integer
    round: string
    signature: string | undefined
    status: DrandStatus
    transactionIntentId: UUID | undefined
}

export interface Database {
    randomnesses: RandomnessRow
    drands: DrandRow
}

export function randomnessRowToEntity(row: RandomnessRow): Randomness {
    return new Randomness({
        blockNumber: BigInt(row.blockNumber),
        value: BigInt(row.value),
        hashedValue: row.hashedValue,
        commitmentTransactionIntentId: row.commitmentTransactionIntentId,
        revealTransactionIntentId: row.revealTransactionIntentId,
        status: row.status,
    })
}

export function randomnessEntityToRow(entity: Randomness): RandomnessRow {
    return {
        blockNumber: bigIntToZeroPadded(entity.blockNumber, DIGITS_MAX_UINT256),
        value: bigIntToZeroPadded(entity.value, DIGITS_MAX_UINT256),
        hashedValue: entity.hashedValue,
        commitmentTransactionIntentId: entity.commitmentTransactionIntentId,
        revealTransactionIntentId: entity.revealTransactionIntentId,
        status: entity.status,
    }
}
