import type { HappyUser } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/index"
import {
    type AppPermissions,
    type PermissionRequest,
    type PermissionsMap,
    type WalletPermission,
    permissionsAtom,
} from "../../state/permissions.ts"
import { getUser } from "../../state/user"
import { emitUserUpdate } from "../../utils/emitUserUpdate.ts"
import { getDappOrigin, getIframeOrigin } from "../../utils/getDappOrigin"

// === NOTICE ======================================================================================

// Refer to src/state/permissions.ts for more information on how types are stored / typed.

// === CONSTANTS ===================================================================================

const store = getDefaultStore()
const dappOrigin = getDappOrigin()
const iframeOrigin = getIframeOrigin()
const sameOrigin = dappOrigin === iframeOrigin

// === UTILS =======================================================================================

export function getDappPermissions(
    user: HappyUser | undefined = getUser(),
    permissions: PermissionsMap = store.get(permissionsAtom),
): AppPermissions {
    if (!user) {
        console.warn("No user found, returning empty permissions.")
        return new Map()
    }

    const appAndUser = { user: user?.address, app: dappOrigin }
    const permissionLookupResult = permissions.get(appAndUser)

    if (!permissionLookupResult) {
        // Permissions don't exist, create them.
        let basePermissions: AppPermissions

        if (user && sameOrigin) {
            // The iframe is always granted the `eth_accounts` permission.
            const eth_accounts: WalletPermission = {
                invoker: iframeOrigin,
                parentCapability: "eth_accounts",
                caveats: [],
            }
            basePermissions = new Map([["eth_accounts", eth_accounts]])
        } else {
            basePermissions = new Map()
        }

        permissions.set(appAndUser, basePermissions)
        return basePermissions
    }

    return permissionLookupResult
}

function setDappPermissions(permissions: AppPermissions): void {
    const user = getUser()
    if (!user) {
        console.warn("No user found, not setting permissions.")
        return
    }
    store.set(permissionsAtom, (prev) => {
        prev.set({ user: user?.address, app: dappOrigin }, permissions)
        return new Map(prev)
    })
}

function getPermissionArray(permissions: string | PermissionRequest | PermissionRequest[]): PermissionRequest[] {
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
    permissions: string | PermissionRequest | PermissionRequest[],
    dappPermissions: AppPermissions = getDappPermissions(),
): WalletPermission[] {
    const grantedPermissions = []

    for (const permission of getPermissionArray(permissions)) {
        const [[name, value]] = Object.entries(permission)

        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats Not Yet Supported")
        }

        const grantedPermission = {
            caveats: [],
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
    permissions: string | PermissionRequest | PermissionRequest[],
    dappPermissions: AppPermissions = getDappPermissions(),
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
    permissions: string | PermissionRequest | PermissionRequest[],
    dappPermissions: AppPermissions = getDappPermissions(),
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
export function getAllPermissions(dappPermissions: AppPermissions = getDappPermissions()): WalletPermission[] {
    return Array.from(dappPermissions.values())
}

// === QUERY PERMISSIONS (WITH CAVEATS) ============================================================

/**
 * Returns the given permission(s). This only considers the keys of the permission object,
 * and returns an aray that contains the permission only if it is granted, along with its caveats.
 */
export function getPermissions(
    permissions: string | PermissionRequest | PermissionRequest[],
    dappPermissions: AppPermissions = getDappPermissions(),
): WalletPermission[] {
    return getPermissionArray(permissions)
        .flatMap((param) => Object.keys(param))
        .map((name) => dappPermissions.get(name))
        .filter((permission) => !!permission)
}

// === CLEAR PERMISSIONS ===========================================================================

/**
 * Clears all permissions for the current user + app pair.
 */
export function clearPermissions(): void {
    const user = getUser()
    if (!user) return
    store.set(permissionsAtom, (prev) => {
        prev.delete({ user: user?.address, app: dappOrigin })
        return new Map(prev)
    })
}
