import type { Hex, UUID } from "@happy.tech/common"
import { bigIntToZeroPadded } from "@happy.tech/common"
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

// Quantity of digits in the max uint256 value
export const DIGITS_MAX_UINT256 = 78

export function commitmentInfoToDb(commitmentInfo: CommitmentInfo): CommitmentInfoTable {
    return {
        timestamp: bigIntToZeroPadded(commitmentInfo.timestamp, DIGITS_MAX_UINT256),
        value: bigIntToZeroPadded(commitmentInfo.value, DIGITS_MAX_UINT256),
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
