import type { Boop } from "#lib/interfaces/Boop"

/**
 * Customize this to define a custom submitter fee policy. Returns 0 by default.
 */
export function getSubmitterFee(_boop: Boop): bigint {
    return 0n
}
