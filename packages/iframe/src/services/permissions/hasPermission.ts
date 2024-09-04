import type { WalletPermissionRequest } from "../../state/permissions"
import { getDappPermissions } from "./utils"

/**
 * Check if user has authorized permissions.
 * Being variadic, multiple permissions can be requested,
 * and the response will be all or nothing
 *
 * @notice
 * Caveats are not yet supported
 *
 * @example
 * check if the dapp can access current user address
 * ```ts
 * hasPermission({ eth_accounts: {} })
 * ```
 */
export function hasPermission(...permissions: WalletPermissionRequest[]): boolean {
    const dappPermissions = getDappPermissions()
    if (!dappPermissions.size || !permissions.length) return false

    return permissions.every((param) => {
        const [[name, value]] = Object.entries(param)

        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats Not Yet Supported")
        }

        return dappPermissions.has(name)
    })
}
