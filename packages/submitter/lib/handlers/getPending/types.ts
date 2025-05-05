import type { Address, Hash, UInt256 } from "@happy.tech/common"
import { SubmitterError, type SubmitterErrorStatus } from "#lib/types"

// TODO documentation

export const GetPending = {
    Success: "getPendingSuccess",
    ...SubmitterError,
} as const

export type GetPendingStatus = (typeof GetPending)[keyof typeof GetPending]

export type GetPendingInput = {
    account: Address
}

export type GetPendingOutput = GetPendingSuccess | GetPendingError

export type GetPendingSuccess = {
    status: typeof GetPending.Success
    account: Address
    pending: PendingBoopInfo[]
}

export type PendingBoopInfo = {
    hash: Hash
    nonceTrack: UInt256
    nonceValue: UInt256
    submitted: boolean
}

export type GetPendingError = {
    status: SubmitterErrorStatus
    description?: string
}
