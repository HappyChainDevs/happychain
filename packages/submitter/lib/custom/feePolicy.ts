import type { PartialBoop } from "#lib/interfaces/Boop"

/**
 * Customize this to define a custom submitter fee policy. Returns 0 by default.
 */
export function getSubmitterFee(_boop: PartialBoop): bigint {
    return 0n
}
