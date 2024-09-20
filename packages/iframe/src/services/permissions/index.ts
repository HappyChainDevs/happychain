import {
    type DappPermissionMap,
    type WalletPermission,
    type WalletPermissionRequest,
    getPermissions as getAtomPermissions,
} from "../../state/permissions"
import { getUser } from "../../state/user"
import { getDappOrigin } from "../../utils/getDappOrigin"
import { getPermissionAction, hasPermissionAction, revokePermissionAction, setPermissionAction } from "./actions"
import { clearDappPermissions, getPermissionsForDapp } from "./utils"

// NOTE: If you need to modify or query the user's permissions from React, use the hooks in
// `src/hooks/usePermissions.ts` instead of these functions — they will update whenever the
// permissions change.

const dappOrigin = getDappOrigin()

function getDappPermissions(): DappPermissionMap {
    return getPermissionsForDapp(dappOrigin, getUser(), getAtomPermissions())
}

function getPermissionArray(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
): WalletPermissionRequest[] {
    // biome-ignore format: readability
    return typeof permissions === "string"
        ? [{ [permissions]: {} }]
        : Array.isArray(permissions)
            ? permissions
            : [permissions]
}

/**
 * Grants the given permission(s) for the user and returns the list of granted permissions.
 *
 * @notice Caveats are not yet supported
 */
export function grantPermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
): WalletPermission[] {
    const _permissions = getPermissionArray(permissions)
    return setPermissionAction(_permissions, getUser(), dappPermissions)
}

/**
 * Revokes the given permission(s) of the user.
 */
export function revokePermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
) {
    const _permissions = getPermissionArray(permissions)
    return revokePermissionAction(_permissions, dappPermissions)
}

/**
 * Check if user has (all of) the given permission(s).
 *
 * @notice Caveats are not yet supported
 */
export function hasPermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
): boolean {
    const _permissions = getPermissionArray(permissions)
    return hasPermissionAction(_permissions, dappPermissions)
}

/**
 * Return all of the user's permissions.
 */
export function getAllPermissions(dappPermissions: DappPermissionMap = getDappPermissions()): WalletPermission[] {
    return Array.from(dappPermissions.values())
}

/**
 * Returns the given permission(s). This only considers the keys of the permission object,
 * and returns an aray that contains the permission only if it is granted, along with its caveats.
 */
export function getPermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
): WalletPermission[] {
    const _permissions = getPermissionArray(permissions)
    return getPermissionAction(_permissions, dappPermissions)
}

/**
 * Clears all permissions for the current user.
 */
export function clearPermissions() {
    clearDappPermissions()
}
