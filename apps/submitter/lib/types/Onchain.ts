/**
 * Possible outcomes of submitting the Boop to the onchain EntryPoint
 * contract, either during simulation or onchain execution.
 */
export const Onchain = {
    /** The Boop succeeded: the intended call was made without errors. */
    Success: "onchainSuccess",

    /**
     * The boop passes simulation but can't be submitted onchain because either validation or payment validation has
     * indicated that the status is unknown during validation. This typically means they need a signature, which could
     * only be obtained once simulation was used to get the gas values to sign over (for self-paying transactions).
     */
    MissingValidationInformation: "onchainMissingValidationInformation",

    /**
     * A self-paying boop passes simulation but can't be submitted onchain because either its
     * maxFeePerGas or gas limits are set to zero — this means either this would fail onchain because
     * of zero values, or if we attach updated values, the signature would fail to verify. The Boop
     * system imposes that a self-paying transaction must sign over its actual gas values for security.
     */
    MissingGasValues: "onchainMissingGasValues",

    /**
     * The boop got rejected because the maxFeePerGas was lower than the onchain gas price (base fee).
     */
    GasPriceTooLow: "onchainGasPriceTooLow",

    /**
     * The nonce provided was invalid outside of simulation.
     */
    InvalidNonce: "onchainInvalidNonce",

    /**
     * The submitter or paymaster has insufficient stake.
     */
    InsufficientStake: "onchainInsufficientStake",

    /**
     * The account or the paymaster rejected the boop because of an invalid signature.
     */
    InvalidSignature: "onchainInvalidSignature",

    /**
     * The account or the paymaster rejected the boop because an extension value in the extraData is invalid.
     */
    InvalidExtensionValue: "onchainInvalidExtensionValue",

    /**
     * The account or the paymaster rejected the boop because the extension is already registered.
     */
    ExtensionAlreadyRegistered: "onchainExtensionAlreadyRegistered",

    /**
     * The account or the paymaster rejected the boop because the extension hash not been registered.
     */
    ExtensionNotRegistered: "onchainExtensionNotRegistered",

    /**
     * The account validation of the Boop reverted.
     * This indicates either a dysfunctional account or a dysfunctional submitter.
     */
    ValidationReverted: "onchainValidationReverted",

    /**
     * The account rejected the boop during validation.
     */
    ValidationRejected: "onchainValidationRejected",

    /**
     * The paymaster's `payout` call reverted.
     * This indicates either a dysfunctional paymaster or a dysfunctional submitter.
     */
    PaymentValidationReverted: "onchainPaymentValidationReverted",

    /**
     * The paymaster rejected the boop during payment validation.
     */
    PaymentValidationRejected: "onchainPaymentValidationRejected",

    /**
     * The account's `execute` call reverted.
     */
    ExecuteReverted: "onchainExecuteReverted",

    /**
     * The account's `execute` function returned indicating a failure.
     * This is typically caused by an incorrect input from the user.
     */
    ExecuteRejected: "onchainExecuteRejected",

    /**
     * The call made by the account's `execute` function reverted.
     */
    CallReverted: "onchainCallReverted",

    /**
     * When self-paying and the payment from the account fails, either because IAccount.payout
     * reverts, consumes too much gas, or does not transfer the full cost to the submitter.
     */
    PayoutFailed: "onchainPayoutFailed",

    /**
     * The EntryPoint ran out of gas. This is not supposed to happen and indicates either:
     *
     * 1. In the case of a self-paying transaction, a `payout` function that consumes more gas during execution than
     *    during simulation.
     *
     * 2. A submitter with a custom `receive` or `fallback` function that consumes more gas during execution than during
     *    simulation.
     *
     * 3. An issue with the submitter, as only the EntryPoint can revert, and because of simulation we should always be
     *    able to provide enough gas that this does not happen (third-parties like accounts and paymasters are provided
     *    their separate gas limits and so cannot trigger an EntryPoint OOG revert).
     */
    EntryPointOutOfGas: "onchainEntryPointOutOfGas",

    /**
     * Unexpected revert of the boop, this is not supposed to happen and indicates a deep issue, in theory only possible
     * if the EntryPoint contract itself is faulty.
     */
    UnexpectedReverted: "onchainUnexpectedReverted",
} as const

export const { Success, ...OnchainFail } = Onchain

/**
 * @inheritDoc Onchain
 * cf. {@link Onchain}
 */
export type OnchainStatus = (typeof Onchain)[keyof typeof Onchain]

/**
 * Checks is a status string is a {@link OnchainStatus}.
 */
export function isOnchain(status: string): status is OnchainStatus {
    return status.startsWith("onchain")
}
