import type { SimulateOutput } from "#lib/handlers/simulate/types"
import { traceFunction } from "#lib/telemetry/traces"
import { type Boop, Onchain } from "#lib/types"
import { computeHash } from "#lib/utils/boop/computeHash"
import { logger } from "#lib/utils/logger"

/**
 * Customize this to react to "misbehaviour" from account contracts, paymasters detected during
 * either simulation or onchain execution (as indicated by whether the {@link simulation} is set).
 *
 * Note that this will be called with error outputs that **do not** represent misbehaviour — follow the
 * template implementation of this function for an indication of what you can consider reacting too.
 */
// biome-ignore lint/correctness/noUnusedVariables: template
function notePossibleMisbehaviour(boop: Boop, output: SimulateOutput, simulation?: "simulation"): void {
    // biome-ignore format: indent comments
    switch (output.status) {

        // === REJECTIONS ===

        case Onchain.ExecuteRejected:
            // This is okay during simulation, not okay during execution — the conditions shouldn't change.
        case Onchain.ValidationRejected:
            // This is okay during simulation, but shouldn't happen too often during execution — as this causes
            // losses to the submitter. Watch this for sign of griefing.
        case Onchain.PaymentValidationRejected:
            // This is okay during simulation, but shouldn't happen too often during execution — as this causes
            // losses to the submitter. Watch this for sign of griefing.

        // === REVERTS ===

        case Onchain.ValidationReverted:
            // Note the account as suspicious: validation is never supposed to revert during validation, only return
            // encoded errors. It's also supposed to not use more gas during validation than it does during execution.
        case Onchain.PaymentValidationReverted:
            // Note the paymaster as suspicious: validation is never supposed to revert during validation, only return
            // encoded errors. It's also supposed to not use more gas during validation than it does during execution.
        case Onchain.ExecuteReverted:
            // Note the account as suspicious: the account's `execute` function is not supposed to revert, only
            // return encoded errors (included to signal the target call's revert, which it should always catch).
        case Onchain.UnexpectedReverted:
            /**
             * cf. docstring of {@link Onchain.UnexpectedReverted}, this is *normally* indicative of an
             * implementation or * configuration problem. We log this in {@link outputForRevertError}.
             *
             * TODO ... but in the current state we can't parse onchain execution revert, so if this is from
             *          onchain execution, it might hide any of the three previous xxxReverted statuses. In any case,
             *          this can be penalized as the EntryPoint is never supposed to revert, so this should denote either
             *          an account or paymaster problem.
             */
        case Onchain.EntryPointOutOfGas:
            // The boop reverted with out of gas, which should not be possible if the account and paymaster
            // are correct, as they are not supposed to consume more gas during execution than simulation.

        // === PAYMENT ===

        case Onchain.InsufficientStake:
            // Note the paymaster as insufficiently staked. This is not necessarily a sign of misbehaviour, but can be used
            // as a policy parameter to deprioritize paymasters that have been known to let their stake slip.
        case Onchain.PayoutFailed:
            // An account failed to make the payment for a self-paying boop. This is concerning if it happens
            // after simulation, as it constitutes a loss for the submitter, though a submitter could
            // also choose to penalize/deprioritize accounts for which this happens at simulation time.

            logger.info("Encountered account or paymaster misbehavour", computeHash(boop), output)
            break

        default:
            // Here we can increment some global failure counter, which can help us deprioritize
            // sessions (if we decided to add them!) that tend to have a high failure ratio.
    }
}

const tracedNotePossibleMisbehaviour = traceFunction(notePossibleMisbehaviour, "notePossibleMisbehaviour")

export { tracedNotePossibleMisbehaviour as notePossibleMisbehaviour }
