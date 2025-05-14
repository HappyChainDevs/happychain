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

/** Output of an `execute` call (`boop/execute` route): either a successful execution, or a failed execution. */
export type ExecuteOutput = ExecuteSuccess | ExecuteError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** Successful `execute` call. */
export type ExecuteSuccess = {
    status: typeof Onchain.Success

    /** Receipt for the included and successfully executed boop. */
    receipt: BoopReceipt
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
     * onchain), and second we use carrier error to commit the errors back to the submitter.
     *
     * TODO - Info about simulation vs execution (right now this is always simulation, but I think we can use an event
     *        to get this from execution too).
     *      - After, copy this docstring to the other `revertData` fields.
     */
    revertData?: Bytes

    /** Description of the problem. */
    description: string
}

// =====================================================================================================================
