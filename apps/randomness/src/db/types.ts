import { type Hex, type UUID, bigIntToZeroPadded } from "@happy.tech/common"
import { Randomness, type RandomnessStatus } from "../Randomness"
import { DIGITS_MAX_UINT256 } from "../RandomnessRepository"

// Values are stored as strings because they can be large numbers bigger than the max value of an SQLite integer
export interface RandomnessRow {
    timestamp: string
    value: string
    hashedValue: Hex
    commitmentTransactionIntentId: UUID | undefined
    revealTransactionIntentId: UUID | undefined
    status: RandomnessStatus
}

export interface Database {
    randomnesses: RandomnessRow
}

export function randomnessRowToEntity(row: RandomnessRow): Randomness {
    return new Randomness({
        timestamp: BigInt(row.timestamp),
        value: BigInt(row.value),
        hashedValue: row.hashedValue,
        commitmentTransactionIntentId: row.commitmentTransactionIntentId,
        revealTransactionIntentId: row.revealTransactionIntentId,
        status: row.status,
    })
}

export function randomnessEntityToRow(entity: Randomness): RandomnessRow {
    return {
        timestamp: bigIntToZeroPadded(entity.timestamp, DIGITS_MAX_UINT256),
        value: bigIntToZeroPadded(entity.value, DIGITS_MAX_UINT256),
        hashedValue: entity.hashedValue,
        commitmentTransactionIntentId: entity.commitmentTransactionIntentId,
        revealTransactionIntentId: entity.revealTransactionIntentId,
        status: entity.status,
    }
}
