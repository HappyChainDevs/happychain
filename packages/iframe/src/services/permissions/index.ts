import { type HappyUser, createUUID } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/index"
import {
    type DappPermissionMap,
    type GlobalPermissionMap,
    type WalletPermission,
    type WalletPermissionRequest,
    getPermissions as getAtomPermissions,
    permissionsAtom,
} from "../../state/permissions"
import { getUser } from "../../state/user"
import { emitUserUpdate } from "../../utils/emitUserUpdate.ts"
import { getDappOrigin, getIframeOrigin } from "../../utils/getDappOrigin"

// === NOTICE ======================================================================================

// If you need to modify or query the user's permissions from React, use or create a hook in
// `src/hooks/usePermissions.ts` instead of these functions — they will update whenever the
// permissions change.

// === CONSTANTS ===================================================================================

const store = getDefaultStore()
const dappOrigin = getDappOrigin()
const iframeOrigin = getIframeOrigin()
const sameOrigin = dappOrigin === iframeOrigin

// === UTILS =======================================================================================

export function getDappPermissions(
    user: HappyUser | undefined = getUser(),
    permissions: GlobalPermissionMap = getAtomPermissions(),
): DappPermissionMap {
    const permissionLookupResult = permissions.get(dappOrigin)

    if (!permissionLookupResult) {
        // Permissions don't exist, create them.
        let basePermissions: DappPermissionMap

        if (user && sameOrigin) {
            // The iframe is always granted the `eth_accounts` permission.
            const eth_accounts: WalletPermission = {
                invoker: iframeOrigin,
                date: Date.now(),
                id: createUUID(),
                parentCapability: "eth_accounts",
                caveats: [],
            }
            basePermissions = new Map([["eth_accounts", eth_accounts]])
        } else {
            basePermissions = new Map()
        }

        permissions.set(dappOrigin, basePermissions)
        return basePermissions
    }

    return permissionLookupResult
}

function setDappPermissions(permissions: DappPermissionMap): void {
    store.set(permissionsAtom, (prev) => {
        prev.set(dappOrigin, permissions)
        return new Map(prev)
    })
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

// === GRANT PERMISSIONS ===========================================================================

/**
 * Grants the given permission(s) for the user and returns the list of granted permissions.
 *
 * @notice Caveats are not yet supported
 */
export function grantPermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
): WalletPermission[] {
    const grantedPermissions = []

    for (const permission of getPermissionArray(permissions)) {
        const [[name, value]] = Object.entries(permission)

        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats Not Yet Supported")
        }

        const grantedPermission = {
            caveats: [],
            id: createUUID(),
            date: Date.now(),
            invoker: dappOrigin,
            parentCapability: name,
        }
        grantedPermissions.push(grantedPermission)
        dappPermissions.set(name, grantedPermission)

        if (name === "eth_accounts") {
            emitUserUpdate(getUser())
        }
    }

    setDappPermissions(dappPermissions)
    return grantedPermissions
}

// === REVOKE PERMISSIONS ==========================================================================

/**
 * Revokes the given permission(s) of the user.
 */
export function revokePermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
): void {
    for (const permission of getPermissionArray(permissions)) {
        const [[name]] = Object.entries(permission)
        dappPermissions.delete(name)
        if (name === "eth_accounts") {
            emitUserUpdate(undefined)
        }
    }

    setDappPermissions(dappPermissions)
}

// === QUERY PERMISSIONS (BOOLEAN) =================================================================

/**
 * Check if user has (all of) the given permission(s).
 *
 * @notice Caveats are not yet supported
 */
export function hasPermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
): boolean {
    return getPermissionArray(permissions).every((param) => {
        const [[name, value]] = Object.entries(param)

        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats Not Yet Supported")
        }

        return dappPermissions.has(name)
    })
}

/**
 * Return all of the user's permissions.
 */
export function getAllPermissions(dappPermissions: DappPermissionMap = getDappPermissions()): WalletPermission[] {
    return Array.from(dappPermissions.values())
}

// === QUERY PERMISSIONS (WITH CAVEATS) ============================================================

/**
 * Returns the given permission(s). This only considers the keys of the permission object,
 * and returns an aray that contains the permission only if it is granted, along with its caveats.
 */
export function getPermissions(
    permissions: string | WalletPermissionRequest | WalletPermissionRequest[],
    dappPermissions: DappPermissionMap = getDappPermissions(),
): WalletPermission[] {
    return getPermissionArray(permissions)
        .flatMap((param) => Object.keys(param))
        .map((name) => dappPermissions.get(name))
        .filter((permission) => !!permission)
}

// === CLEAR PERMISSIONS ===========================================================================

/**
 * Clears all permissions for the current dapp.
 */
export function clearPermissions(): void {
    store.set(permissionsAtom, (prev) => {
        prev.delete(dappOrigin)
        return new Map(prev)
    })
}
