import type { Hex, UUID } from "@happychain/common"
import type { CommitmentInfo } from "../CommitmentManager"

export interface CommitmentInfoTable {
    timestamp: bigint
    // The value is stored as a string because it can be a large number bigger than the max value of an SQLite integer
    value: string
    commitment: Hex
    transactionIntentId: UUID
}

export interface Database {
    commitments: CommitmentInfoTable
}

export function commitmentInfoToDb(commitmentInfo: CommitmentInfo): CommitmentInfoTable {
    return {
        timestamp: commitmentInfo.timestamp,
        value: commitmentInfo.value.toString(),
        commitment: commitmentInfo.commitment,
        transactionIntentId: commitmentInfo.transactionIntentId,
    }
}

export function dbToCommitmentInfo(db: CommitmentInfoTable): CommitmentInfo {
    return {
        timestamp: db.timestamp,
        value: BigInt(db.value),
        commitment: db.commitment,
        transactionIntentId: db.transactionIntentId,
    }
}
