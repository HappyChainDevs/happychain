import type { Bytes, UInt32 } from "@happy.tech/common"

/**
 * Copied from `apps/submitter/lib/types/EntryPointOutput.ts` to avoid dependency madness.
 */
enum CallStatus {
    SUCCEEDED = 0,
    CALL_REVERTED = 1,
    EXECUTE_FAILED = 2,
    EXECUTE_REVERTED = 3,
}

/**
 * Copied from `apps/submitter/lib/types/EntryPointOutput.ts` to avoid dependency madness.
 */
type EntryPointOutput = {
    /**
     * An overestimation of the minimum gas limit necessary to successfully call `EntryPoint.submit`
     * at the top-level of a transaction.
     */
    gas: UInt32
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * `IAccount.validate` from `EntryPoint.submit`.
     */
    validateGas: UInt32
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * `IPaymaster.validatePayment` from `EntryPoint.submit`.
     */
    validatePaymentGas: UInt32
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * `IAccount.execute` from `EntryPoint.submit`.
     */
    executeGas: UInt32
    /**
     * If true, indicates that the account couldn't ascertain whether the validation was successful
     * in validation mode (e.g. it couldn't validate a signature because the simulation was used
     * to populate some of the fields that the signature signs over).
     */
    validityUnknownDuringSimulation: boolean
    /**
     * If true, indicates that the paymaster couldn't ascertain whether the validation was
     * successful in validation mode (e.g. it couldn't validate a signature because the simulation
     * was used to populate some of the fields that the signature signs over).
     */
    paymentValidityUnknownDuringSimulation: boolean
    /**
     * If true, indicates that while the simulation succeeded, the nonce is ahead of the current
     * nonce.
     */
    futureNonceDuringSimulation: boolean
    /**
     * If true, indicates that in simulation mode, the provided maxFeePerGas is lower than the
     * current gas price.
     */
    feeTooLowDuringSimulation: boolean
    /**
     * Status of the call specified by the boop.
     */
    callStatus: CallStatus
    /**
     * Depending on `callStatus`: the revertData with which either the call or the
     * `IAccount.execute` function reverted, or the rejection reason (encoded error) returned by
     * `IAccount.execute`.
     */
    revertData: Bytes
}

/**
 * Copied from `apps/submitter/lib/handlers/simulate/types.ts` to avoid dependency madness.
 */
export type SimulateSuccess = Omit<EntryPointOutput, "revertData"> & {
    status: "onchainSuccess"

    /** Estimated max fee per gas (in wei) for the Boop. */
    maxFeePerGas: bigint

    /** Total fee requested by the submitter for submitting this boop (in wei). */
    submitterFee: bigint

    revertData?: undefined
    description?: undefined
}
