import { createUUID } from "@happychain/common"
import { logger } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/index"
import type { WalletPermissionCaveat } from "viem"
import {
    type AppPermissions,
    type PermissionsMap,
    type PermissionsRequest,
    type WalletPermission,
    permissionsMapAtom,
} from "../state/permissions"
import { getUser } from "../state/user"
import { type AppURL, getAppURL, getIframeURL } from "../utils/appURL"
import { emitUserUpdate } from "../utils/emitUserUpdate"

// === NOTICE ======================================================================================

// Refer to src/state/permissions.ts for more information on how types are stored / typed.

// === CONSTANTS ===================================================================================

const store = getDefaultStore()

// === UTILS =======================================================================================

/**
 * Returns all permissions for the current user on the given app.
 */
export function getAppPermissions(app: AppURL): AppPermissions {
    const user = getUser()
    if (!user) {
        // This should never happen and requires investigating if it does!
        logger.warn("No user found, returning empty permissions.")
        return {}
    }

    const permissionsMap = store.get(permissionsMapAtom)
    const appPermissions = permissionsMap[user.address]?.[app]

    if (appPermissions) {
        return appPermissions
    }

    // Permissions don't exist, create them.

    const baseAppPermissions: AppPermissions =
        app === getIframeURL()
            ? {
                  // The iframe is always granted the `eth_accounts` permission.
                  eth_accounts: {
                      invoker: app,
                      parentCapability: "eth_accounts",
                      caveats: [],
                      date: Date.now(),
                      id: createUUID(),
                  },
              }
            : {}

    // It's not required to set the permissionsAtom here because the permissions don't actually
    // change (so nothing dependent on the atom needs to update). We just write them to avoid
    // rerunning the above logic on each lookup.
    permissionsMap[user.address] ??= {}
    permissionsMap[user.address][app] = baseAppPermissions

    return baseAppPermissions
}

/**
 * Sets the permissions for the current user on the given app.
 */
function setAppPermissions(app: AppURL, appPermissions: AppPermissions): void {
    const user = getUser()

    if (!user) {
        // This should never happen and requires investigating if it does!
        logger.warn("No user found, not setting permissions.")
        return
    }

    const permissionArray = Object.values(appPermissions)

    if (!permissionArray.length) {
        clearAppPermissions(app)
        return
    }

    store.set(permissionsMapAtom, (prev: PermissionsMap) => {
        if (!permissionArray.every((a) => a.invoker === app)) {
            // No all permissions supplied are scoped to the app.
            // This should never happen!
            console.warn("Invalid permission update requested, not setting permissions.")
            return prev
        }

        return {
            ...prev,
            [user.address]: { ...prev[user.address], [app]: appPermissions },
        }
    })
}

type PermissionRequestEntry = {
    name: string
    caveats: WalletPermissionCaveat[]
}

/**
 * Converts a permission spec into an array of permission request entries.
 */
function permissionRequestEntries(permissions: PermissionsRequest): PermissionRequestEntry[] {
    const entries: [string, { [caveatType: string]: unknown }][] =
        typeof permissions === "string" //
            ? [[permissions, {}]]
            : Object.entries(permissions)

    return entries.map(([name, caveatsRequest]) => {
        if (typeof caveatsRequest === "object" && Object.keys(caveatsRequest).length) {
            throw new Error("Wallet permission caveats not yet supported")
        }

        // Proper caveat transposition logic — though never used in practice.
        const caveats: WalletPermissionCaveat[] = //
            Object.entries(caveatsRequest) //
                .map(([type, value]) => ({ type, value }))

        return { name, caveats }
    })
}

// === GRANT PERMISSIONS ===========================================================================

/**
 * Grants the given permission(s) for the current user and the given app, and returns the list of
 * granted permissions.
 */
export function grantPermissions(
    app: AppURL, //
    permissionRequest: PermissionsRequest,
): WalletPermission[] {
    const grantedPermissions = []
    const appPermissions = getAppPermissions(app)

    for (const { name, caveats } of permissionRequestEntries(permissionRequest)) {
        const grantedPermission = {
            caveats: caveats,
            invoker: app,
            parentCapability: name,
            date: Date.now(),
            id: createUUID(),
        }
        grantedPermissions.push(grantedPermission)

        // Ok to update in place: `setAppPermissions` will construct a new object for
        // permissionsMapAtom.
        appPermissions[name] = grantedPermission

        // Accounts permission granted, which lets the app access the user object.
        if (name === "eth_accounts" && app === getAppURL()) {
            emitUserUpdate(getUser())
        }
    }

    setAppPermissions(app, appPermissions)
    return grantedPermissions
}

// === REVOKE PERMISSIONS ==========================================================================

/**
 * Revokes the given permission(s) of the user.
 */
export function revokePermissions(
    app: AppURL, //
    permissionsRequest: PermissionsRequest,
): void {
    const appPermissions = getAppPermissions(app)

    for (const { name } of permissionRequestEntries(permissionsRequest)) {
        delete appPermissions[name]
        if (name === "eth_accounts") {
            emitUserUpdate(undefined)
        }
    }

    setAppPermissions(app, appPermissions)
}

// === QUERY PERMISSIONS (BOOLEAN) =================================================================

/**
 * Check if user has (all of) the given permission(s).
 */
export function hasPermissions(
    app: AppURL, //
    permissionsRequest: PermissionsRequest,
): boolean {
    const appPermissions = getAppPermissions(app)
    return permissionRequestEntries(permissionsRequest).every(({ name }) => name in appPermissions)
}

/**
 * Return all of the user's permissions.
 */
export function getAllPermissions(app: AppURL): WalletPermission[] {
    return Array.from(Object.values(getAppPermissions(app)))
}

// === QUERY PERMISSIONS (WITH CAVEATS) ============================================================

/**
 * Returns the given permission(s). This only considers the keys of the permission object,
 * and returns an aray that contains the permission only if it is granted, along with its caveats.
 */
export function getPermissions(
    app: AppURL, //
    permissionsRequest: PermissionsRequest,
): WalletPermission[] {
    const appPermissions = getAppPermissions(app)
    return permissionRequestEntries(permissionsRequest)
        .map(({ name }) => appPermissions[name])
        .filter(Boolean)
}

// === CLEAR PERMISSIONS ===========================================================================

/**
 * Clears all permissions for the current user (for all apps).
 */
export function clearPermissions(): void {
    const user = getUser()
    if (!user) return
    store.set(permissionsMapAtom, (prev) => {
        const { [user.address]: _, ...rest } = prev
        return rest
    })
}

/**
 * Clears all permissions for the user on the given app.
 */
export function clearAppPermissions(app: AppURL): void {
    const user = getUser()
    if (!user) return
    store.set(permissionsMapAtom, (prev) => {
        const {
            [user.address]: { [app]: _, ...otherApps },
            ...otherUsers
        } = prev
        return { ...otherUsers, [user.address]: otherApps }
    })
}
