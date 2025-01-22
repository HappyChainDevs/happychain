import type { WalletPermissionCaveat } from "viem"

/**
 * Checks if two caveats match by comparing their type and value.
 *
 * @param caveatA - Caveat to compare
 * @param caveatB - Other caveat to compare
 *
 * @example
 * ```
 * checkIfCaveatsMatch(
 *   { type: "target", value: "0x123" },
 *   { type: "target", value: "0x123" }
 * )
 * ```
 */
export function checkIfCaveatsMatch(caveatA: WalletPermissionCaveat, caveatB: WalletPermissionCaveat): boolean {
    return caveatA.type === caveatB.type && caveatA.value === caveatB.value
}
