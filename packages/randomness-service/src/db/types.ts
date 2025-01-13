import type { Hex, UUID } from "@happychain/common"
import type { CommitmentInfo } from "../CommitmentManager"

// Values are stored as strings because they can be large numbers bigger than the max value of an SQLite integer
export interface CommitmentInfoTable {
    timestamp: string
    value: string
    commitment: Hex
    transactionIntentId: UUID
}

export interface Database {
    commitments: CommitmentInfoTable
}

export function commitmentInfoToDb(commitmentInfo: CommitmentInfo): CommitmentInfoTable {
    return {
        timestamp: commitmentInfo.timestamp.toString(),
        value: commitmentInfo.value.toString(),
        commitment: commitmentInfo.commitment,
        transactionIntentId: commitmentInfo.transactionIntentId,
    }
}

export function dbToCommitmentInfo(db: CommitmentInfoTable): CommitmentInfo {
    return {
        timestamp: BigInt(db.timestamp),
        value: BigInt(db.value),
        commitment: db.commitment,
        transactionIntentId: db.transactionIntentId,
    }
}
