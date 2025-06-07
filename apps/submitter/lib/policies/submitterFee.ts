import type { Boop } from "#lib/types"

/**
 * Returns the submitter fee to use for sponsored transaction, where the submitter can set the fee.
 * Customize this to implement the pricing policy you want. Returns 0 by default.
 */
export function getSubmitterFee(_boop: Boop): bigint {
    return 0n
}

/**
 * Validates the submitter fee specified by the boop. Returns undefined if accepting, or a description
 * message to reject. Customize this to implement the pricing policy you want. Returns undefined by default.
 */
export function validateSubmitterFee(_boop: Boop): string | undefined {
    return undefined
}
