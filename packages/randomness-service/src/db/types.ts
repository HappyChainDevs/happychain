import type { Hex, UUID } from "@happychain/common"
import type { DrandStatus } from "../Drand"
import type { RandomnessStatus } from "../Randomness"

export interface RandomnessRow {
    // The block number is stored as a number because Kisely automatically converts bigint to number
    blockNumber: number
    // The value is stored as a string because it can be a large number bigger than the max value of an SQLite integer
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
