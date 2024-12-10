import type { Hex, UUID } from "@happychain/common"
import type { RandomnessStatus } from "../Randomnnes"

export interface RandomnessRow {
    // The timestamp is stored as a number because Kisely automatically converts bigint to number
    timestamp: number
    // The value is stored as a string because it can be a large number bigger than the max value of an SQLite integer
    value: string
    hashedValue: Hex
    commitmentTransactionIntentId: UUID | undefined
    revealTransactionIntentId: UUID | undefined
    status: RandomnessStatus
}

export interface Database {
    randomnesses: RandomnessRow
}
