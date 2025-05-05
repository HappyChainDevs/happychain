import type { Address, Bytes, Hash, UInt32 } from "@happy.tech/common"
import { type Boop, Onchain, type OnchainStatus, SubmitterError, type SubmitterErrorStatus } from "#lib/types"

export type SubmitInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop to execute. */
    boop: Boop
}

/**
 * Possible result of a `submit` call.
 */
export const Submit = {
    ...Onchain,
    ...SubmitterError,
} as const

/**
 * @inheritDoc Submit
 * cf. {@link Submit}
 */
export type SubmitStatus = (typeof Submit)[keyof typeof Submit]

/**
 * Output of a `submit` call: either a successful submission, a
 * failed submission, or an offchain failure for other reasons.
 */
export type SubmitOutput = SubmitSuccess | SubmitSimulationFailed | SubmitError

/** Output type of successful `submit` calls. */
export type SubmitSuccess = {
    status: typeof Onchain.Success
    /** Hash of the submitted Boop */
    hash: Hash
    /** Hash of the transaction carrying the Boop */
    // TODO: I refuse
    txHash: Hash
    /** EntryPoint to which the boop was submitted onchain. */
    entryPoint: Address
    /** The total gas limit that was provided for the submitted boop. */
    gasLimit: UInt32
    /** The validation gas that was provided for the submitted boop. */
    validateGasLimit: UInt32
    /** The payment validation gas that was provided for the submitted boop. */
    validatePaymentGasLimit: UInt32
    /** The execute gas that was provided for the submitted boop. */
    executeGasLimit: UInt32
    /** The max fee per gas (in wei) that was provided for the submitted boop. */
    maxFeePerGas: bigint
    /** The total submitter fee (in wei) that was requested/provided for this boop. */
    submitterFee: bigint
}

/** Output type of `submit` who failed simulation "onchain". */
export type SubmitSimulationFailed = {
    status: Exclude<OnchainStatus, typeof Onchain.Success>

    /** Whether the error occurred at the simulation stage or at the submit stage. */
    stage: "simulate" | "submit"

    /**
     * Depending on the status, either missing, or the revert data matching an `Onchain.*Reverted` status, or
     * the the returned encoded error matching an `Onchain.*Rejected` status. This pertains to simulation.
     */
    revertData?: Bytes

    /** Description of the problem. */
    description?: string
}

/** Output type of  `submit` calls that failed for other reasons. */
export type SubmitError = {
    status: SubmitterErrorStatus

    /** Whether the error occurred at the simulation stage or at the submit stage. */
    stage: "simulate" | "submit"

    /** Description of the problem. */
    description?: string
}

// TODO implement cancel
export enum SubmitCancelStatus {
    /** The cancellation was successfully submitted — it can still fail. */
    Success = "executeCancelSuccess",

    /** The cancellation failed because the original was included onchain. */
    OriginalIncluded = "executeCancelFailure",
}
