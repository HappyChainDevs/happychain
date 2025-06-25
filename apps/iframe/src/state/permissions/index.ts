import type { Address } from "@happy.tech/common"
import { permissionsLogger } from "#src/utils/logger"
import { PermissionName } from "#src/constants/permissions"
import { type AppURL, getWalletURL, isApp, isStandaloneWallet } from "#src/utils/appURL"
import { checkIfCaveatsMatch } from "#src/utils/checkIfCaveatsMatch"
import { emitUserUpdate } from "#src/utils/emitUserUpdate"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { getUser } from "#src/state/user"
import { permissionsMapLegend } from "./observable"
import type { AppPermissions, WalletPermission, WalletPermissionCaveat, PermissionsRequest } from "./types"
import type { HappyUser } from "@happy.tech/wallet-common"

// === GET ALL PERMISSIONS =======================================================================================

/**
 * Returns all permissions for the current user on the given app.
 */
export function getAppPermissions(app: AppURL): AppPermissions {
    const user = getUser()
    const permissionsMap = permissionsMapLegend.get()
    return getAppPermissionsPure(user, app, Object.values(permissionsMap))
}
export function getAppPermissionsPure(
    user: HappyUser | undefined,
    app: AppURL,
    permissions: WalletPermission[],
): AppPermissions {
    if (!user) {
        // This should never happen and requires investigating if it does!
        permissionsLogger.warn("No user found, returning empty permissions.")
        return {}
    }

    const appPermissions = permissions.filter((p) => p.invoker === app && p.user === user.address)

    if (appPermissions.length > 0) {
        const appPermissionsObject = appPermissions.reduce((acc, p) => {
            acc[p.parentCapability] = p
            return acc
        }, {} as AppPermissions)
        return appPermissionsObject
    }
    if (app === getWalletURL()) {
        // Permissions don't exist, create them.
        // The iframe is always granted the `eth_accounts` permission.
        const permissionId = `${user.address}-${app}-eth_accounts`
        const permission: WalletPermission = {
            type: "WalletPermissions",
            user: user.address,
            invoker: app,
            parentCapability: "eth_accounts",
            caveats: [],
            date: Date.now(),
            id: permissionId,
            updatedAt: Date.now(),
            createdAt: Date.now(),
            deleted: false,
        }
        permissionsMapLegend[permissionId].set(permission)
        return {
            eth_accounts: permission,
        }
    }

    return {}
}

// === WRITE ALL PERMISSIONS =======================================================================================

/**
 * Sets the permissions for the current user on the given app.
 */
function setAppPermissions(app: AppURL, appPermissions: AppPermissions): void {
    const user = getUser()

    if (!user) {
        // This should never happen and requires investigating if it does!
        permissionsLogger.warn("No user found, not setting permissions.")
        return
    }

    const permissionArray = Object.values(appPermissions)
    if (!permissionArray.length) {
        clearAppPermissions(app)
        return
    }

    if (!permissionArray.every((a) => a.invoker === app)) {
        // No all permissions supplied are scoped to the app.
        // This should never happen!
        console.warn("Invalid permission update requested, not setting permissions.")
        return
    }

    const currentPermissions = getAppPermissions(app)

    for (const permission of Object.values(currentPermissions)) {
        if (!permissionArray.some((p) => p.id === permission.id)) {
            permissionsMapLegend[permission.id].delete()
        }
    }

    for (const permission of permissionArray) {
        permissionsMapLegend[permission.id].set(permission)
    }
}

// === CLEAR PERMISSIONS ===========================================================================

/**
 * Clears all permissions for the current user (for all apps).
 */
export function clearPermissions(): void {
    const user = getUser()
    if (!user) return

    const permissions = permissionsMapLegend.get()
    for (const permission of Object.values(permissions)) {
        if (permission.user === user.address) {
            permissionsMapLegend[permission.id].delete()
        }
    }
}

/**
 * Clears all permissions for the user on the given app.
 */
export function clearAppPermissions(app: AppURL): void {
    const user = getUser()
    if (!user) return
    // Register session keys for onchain deregistrations.
    Object.values(getAppPermissions(app))
        .filter((p: WalletPermission) => p.parentCapability === PermissionName.SessionKey)
        .flatMap((p) => p.caveats)
        .forEach((c) => revokedSessionKeys.add(c.value as Address))

    const permissions = permissionsMapLegend.get()

    for (const permission of Object.values(permissions)) {
        if (permission.invoker === app && permission.user === user.address) {
            permissionsMapLegend[permission.id].delete()
        }
    }
}
type PermissionRequestEntry = {
    name: string
    caveats: WalletPermissionCaveat[]
}

/**
 * Converts a permission spec into an array of permission request entries.
 */
export function permissionRequestEntries(permissions: PermissionsRequest): PermissionRequestEntry[] {
    const entries: [string, { [caveatType: string]: unknown }][] =
        typeof permissions === "string" //
            ? [[permissions, {}]]
            : Object.entries(permissions)

    return entries.map(([name, caveatsRequest]) => {
        const caveats: WalletPermissionCaveat[] = //
            Object.entries(caveatsRequest) //
                .map(([type, value]) => ({ type, value }))

        return { name, caveats }
    })
}

// === GRANT PERMISSIONS ===========================================================================
/**
 * Grants permissions for the current user and the given app.
 *
 * @param app - The URL of the application requesting permissions
 * @param permissionRequest - Permission request object or string
 *
 * @example Grant simple permission
 *```
 * grantPermissions(app, "eth_accounts")
 * ```
 *
 * @example Grant permission with caveat
 *```
 * grantPermissions(app, {
 *   [Permissions.SessionKey]: {
 *     target: contractAddress
 *   }
 * })
 * ```
 */
export function grantPermissions(app: AppURL, permissionRequest: PermissionsRequest): WalletPermission[] {
    const grantedPermissions: WalletPermission[] = []
    const appPermissions = getAppPermissions(app)

    const user = getUser()
    if (!user) return []

    for (const { name, caveats: newCaveats } of permissionRequestEntries(permissionRequest)) {
        // If permission exists, merge new caveats with existing ones
        if (appPermissions[name]) {
            const existingCaveats = appPermissions[name].caveats

            appPermissions[name] = {
                ...appPermissions[name],
                // Avoid duplicate permissions. Only works for caveats with
                // primitive values which is always the case now (session keys).
                caveats: [...existingCaveats, ...newCaveats].filter(
                    (c1, index, self) => self.findIndex((c2) => c2.type === c1.type && c2.value === c1.value) === index,
                ),
            }

            grantedPermissions.push(appPermissions[name])
        } else {
            const id = `${user.address}-${app}-${name}`
            const grantedPermission: WalletPermission = {
                caveats: newCaveats,
                invoker: app,
                parentCapability: name,
                date: Date.now(),
                id,
                updatedAt: Date.now(),
                createdAt: Date.now(),
                type: "WalletPermissions",
                user: user.address,
                deleted: false,
            }
            grantedPermissions.push(grantedPermission)

            // Ok to update in place: setAppPermissions` will construct a new object for
            // permissionsMapAtom.
            appPermissions[name] = grantedPermission
        }

        // Accounts permission granted, which lets the app access the user object.
        if (name === "eth_accounts" && isApp(app) && !isStandaloneWallet()) {
            emitUserUpdate(getUser())
        }

        // If the session keys were previously scheduled to be deleted & unregistered
        // unchain, prevent that from happening. This can happens when toggling
        // a session key permission off then on in the permission management UI.
        //
        // Note there is a possible rare race condition here, where a user toggles a session key off, then registers
        // a new session key for the same target from the app, then toggles the old key back on in the UI. This should
        // mostly not happen, but it will lead to two session keys for the same target to be displayed in the UI.
        if (name === PermissionName.SessionKey) {
            newCaveats.forEach((c) => revokedSessionKeys.delete(c.value as Address))
        }
    }

    setAppPermissions(app, appPermissions)
    return grantedPermissions
}

// === REVOKE PERMISSIONS ==========================================================================

/**
 * Revokes permissions or specific caveats for an app.
 * @param app - The app URL
 * @param permissionsRequest - The permission(s) to revoke, including specific caveats to remove
 *
 * @example Revoke entire permission
 * ```
 * revokePermissions(app, "eth_accounts")
 * ```
 *
 * @example Revoke specific caveat
 * ```
 * revokePermissions(app, {
 *   [Permissions.SessionKey]: {
 *     target: "0xSpecificTargetAddress"
 *   }
 * })
 * ```
 */
export function revokePermissions(app: AppURL, permissionsRequest: PermissionsRequest): void {
    const appPermissions = getAppPermissions(app)
    for (const { name, caveats } of permissionRequestEntries(permissionsRequest)) {
        // Permission is not granted, nothing to do.
        if (!appPermissions[name]) continue

        // If no specific caveats provided, remove entire permission.
        if (!caveats.length) {
            delete appPermissions[name]
            if (name === "eth_accounts") {
                emitUserUpdate(undefined)
            }
            continue
        }

        // Otherwise, remove specific caveats.

        // For session key permission, register the targets for onchain deregistration.
        if (name === PermissionName.SessionKey) {
            caveats.forEach((caveat) => revokedSessionKeys.add(caveat.value as Address))
        }

        const existingPermission = appPermissions[name]
        const remainingCaveats = existingPermission.caveats.filter(
            (existingCaveat) => !caveats.some((caveatToRemove) => checkIfCaveatsMatch(existingCaveat, caveatToRemove)),
        )

        // If no caveats left, remove entire permission
        if (remainingCaveats.length === 0) {
            delete appPermissions[name]
        } else {
            appPermissions[name] = {
                ...existingPermission,
                caveats: remainingCaveats,
            }
        }
    }

    setAppPermissions(app, appPermissions)
}

// === QUERY PERMISSIONS (BOOLEAN) =================================================================

/**
 * Checks if a user has all of the requested permissions for a given app.
 *
 * This supports two types of permission checks :
 * 1. "Simple" permissions (e.g., "eth_accounts"), passed as a `string`
 * 2. Permissions with caveats (e.g., `{ [Permissions.SessionKey]: { target: "0x..." } }`)
 *
 *
 * @example Simple permission
 * ```
 * hasPermissions(app, "eth_accounts")
 * ```
 *
 * @example Permission with caveats
 * ```
 * hasPermissions(app, {
 *   [Permissions.SessionKey]: {
 *     "target": "0x..."
 *   }
 * })
 * ```
 *
 * @param app - The URL of the application requesting permissions.
 * @param permissionsRequest - Either a permission string or an object containing permissions with caveats.
 * @returns `true` if all requested permissions (and their caveats) are granted.
 */
export function hasPermissions(app: AppURL, permissionsRequest: PermissionsRequest): boolean {
    const appPermissions = getAppPermissions(app)

    return permissionRequestEntries(permissionsRequest).every(({ name, caveats }) => {
        const permission = appPermissions[name]
        if (!permission) return false
        if (!caveats.length) return true

        // Verify each requested caveat matches the stored permission
        return caveats.every((caveat) =>
            permission.caveats.some((storedPermission) => checkIfCaveatsMatch(storedPermission, caveat)),
        )
    })
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
 * and returns an array that contains the permission only if it is granted, along with its caveats.
 */
export function getPermissions(
    app: AppURL, //
    permissionsRequest: PermissionsRequest,
): WalletPermission[] {
    const appPermissions = getAppPermissions(app)
    const requestEntries = permissionRequestEntries(permissionsRequest)

    return requestEntries.flatMap(({ name, caveats }) => {
        const permission = appPermissions[name] || []
        // if we have no caveats to filter by, we can return the matching permission
        if (caveats.length === 0) return permission

        // if we have caveats we want to filter by, but the permission does not have
        // any caveats, then it doesn't match the requirements
        if (!permission.caveats) return []

        // check if the permission matches every requested caveat
        const isMatch = caveats.every((requestedCaveat) =>
            permission.caveats.some(
                (permissionCaveat) =>
                    permissionCaveat.type === requestedCaveat.type && permissionCaveat.value === requestedCaveat.value,
            ),
        )

        return isMatch ? permission : []
    })
}
