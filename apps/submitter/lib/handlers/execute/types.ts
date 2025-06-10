import type { Address, Bytes } from "@happy.tech/common"
import { type Boop, type BoopReceipt, Onchain, SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input of an `execute` call (`boop/execute` route). */
export type ExecuteInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop to execute. */
    boop: Boop

    /**
     * Optional time to wait for the receipt, otherwise the submitter will use its default value.
     *
     * The submitter is free to honor this timeout or not based on its own policies (e.g. it
     * might not apply a timeout that is too low or set a cap on the maximum timeout value).
     */
    timeout?: number
}

// =====================================================================================================================
// OUTPUT

/** Possible output status of an `execute` call (`boop/execute` route). */
export const Execute = {
    ...Onchain,
    ...SubmitterError,
} as const

/**
 * @inheritDoc Execute
 * cf. {@link Execute}
 */
export type ExecuteStatus = (typeof Execute)[keyof typeof Execute]

/**
 * Output of an `execute` call (`boop/execute` route): either a successful execution
 * {@link ExecuteSuccess}, or a failed execution {@link ExecuteError}.
 */
export type ExecuteOutput = ExecuteSuccess | ExecuteError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** Successful `execute` call. */
export type ExecuteSuccess = {
    status: typeof Onchain.Success

    /** Receipt for the included and successfully executed boop. */
    receipt: BoopReceipt

    stage?: undefined
    error?: undefined
    revertData?: undefined
}

// =====================================================================================================================
// OUTPUT (ERROR)

/** Failed `execute` call. */
export type ExecuteError = {
    status: Exclude<ExecuteStatus, typeof Onchain.Success>

    /** Whether the error occurred at the simulation or execution stages. */
    stage: "simulate" | "submit" | "execute"

    /**
     * If the status string ends in "Reverted" or "Rejected", this will hold the associated revert or rejection data,
     * if available.
     *
     * Note that this will be different from the revert data of the simulation or onchain execution
     * of the EVM tx that carried the boop, as first of all it might not have reverted (e.g.
     * {@link Onchain.ExecuteReverted} does not cause the transaction to revert when executed
     * onchain), and second we use "carrier errors" to transmit to tag the real errors with their context.
     *
     * At the moment, we can't parse the revert data from onchain execution, so when provided, this
     * will always be an error detected during simulation — this is an EVM RPC limitation that is
     * difficult to work around (it requires tracing the transaction in its intra-block context).
     *
     * True onchain reverts (as opposed to rejections) should be rare, as the system is set up to avoid them —
     * they can only result from incorrectly implemented accounts and paymasters, or from bugs in the submitter.
     */
    revertData?: Bytes

    /** Description of the problem. */
    error: string

    receipt?: undefined
}

// =====================================================================================================================
