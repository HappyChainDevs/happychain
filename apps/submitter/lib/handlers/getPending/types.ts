import type { Address, Hash, UInt256 } from "@happy.tech/common"
import { SubmitterError, type SubmitterErrorStatus } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input of a `execute` call (`boop/execute` route). */
export type GetPendingInput = {
    /** The account for which to get the pending boops. */
    account: Address
}

// =====================================================================================================================
// OUTPUT

/** Possible output status of a `execute` call (`boop/execute` route). */
export const GetPending = {
    Success: "getPendingSuccess",
    ...SubmitterError,
} as const

/**
 * @inheritDoc GetPending
 * cf. {@link GetPending}
 */
export type GetPendingStatus = (typeof GetPending)[keyof typeof GetPending]

/** Output of a `execute` call (`boop/execute` route): success or error. */
export type GetPendingOutput = GetPendingSuccess | GetPendingError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** Successful `getPending` call. */
export type GetPendingSuccess = {
    status: typeof GetPending.Success
    account: Address
    pending: PendingBoopInfo[]
    error?: undefined
}

/** Information about a pending boop. */
export type PendingBoopInfo = {
    boopHash: Hash
    entryPoint: Address
    nonceTrack: UInt256
    nonceValue: UInt256
    /** Whether the boop has been submitted to the blockchain yet. */
    submitted: boolean
}

// =====================================================================================================================
// OUTPUT (ERROR)

/** A failed `getPending` call. */
export type GetPendingError = {
    status: SubmitterErrorStatus
    error: string
    account?: undefined
    pending?: undefined
}

// =====================================================================================================================
