import {
    type DappPermissionMap,
    type WalletPermission,
    type WalletPermissionRequest,
    getPermissions as getAtomPermissions,
} from "../../state/permissions"
import { getUser } from "../../state/user"
import { getDappOrigin } from "../../utils/getDappOrigin"
import type { GetPermissionActionParams, SetPermissionActionParams } from "./actions"
import { getPermissionAction, hasPermissionAction, revokePermissionAction, setPermissionAction } from "./actions"
import { clearDappPermissions, getPermissionsForDapp } from "./utils"

const dappOrigin = getDappOrigin()

function getDappPermissions(): DappPermissionMap {
    return getPermissionsForDapp(dappOrigin, getUser(), getAtomPermissions())
}

/**
 * Action for JSON-RPC request
 * - wallet_requestPermissions
 *
 * @notice
 * Caveats are not yet supported
 *
 * @return WalletPermissions
 */
export function setPermission({ method, params }: SetPermissionActionParams) {
    const dappPermissions = getDappPermissions()
    return setPermissionAction({ method, params } as SetPermissionActionParams, getUser(), dappPermissions)
}

/**
 * Response to JSON-RPC requests
 * - wallet_revokePermissions
 */
export function revokePermission(...params: { [key: string]: unknown }[]) {
    return revokePermissionAction(params, getDappPermissions())
}

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
    return hasPermissionAction(permissions, getDappPermissions())
}

/**
 * Response to JSON-RPC requests
 * - wallet_getPermissions
 * - wallet_requestPermissions
 */
export function getPermissions({ method, params }: GetPermissionActionParams): WalletPermission[] {
    const dappPermissions = getDappPermissions()
    return getPermissionAction({ method, params } as GetPermissionActionParams, dappPermissions)
}

/**
 * Util Shortcut to clear all state for current dapp/user.
 * Does not map to a specific RPC call
 */
export function clearPermissions() {
    // delete all permissions
    clearDappPermissions()
}
