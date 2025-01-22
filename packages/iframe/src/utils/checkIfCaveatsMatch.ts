import type { WalletPermissionCaveat } from "viem"

/**
 * Checks if two caveats match by comparing their type and value.
 *
 * @param caveat1 - Caveat to compare
 * @param caveat2 - Other caveat to compare
 *
 * @example
 * ```
 * caveatMatches(
 *   { type: "target", value: "0x123" },
 *   { type: "target", value: "0x123" }
 * )
 * ```
 */
export function checkIfCaveatsMatch(caveat1: WalletPermissionCaveat, caveat2: WalletPermissionCaveat): boolean {
    return caveat1.type === caveat2.type && caveat1.value === caveat2.value
}
