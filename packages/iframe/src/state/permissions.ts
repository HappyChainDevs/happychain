import { type HTTPString, type UUID, createUUID } from "@happychain/common"
import { logger } from "@happychain/sdk-shared"
import { type Atom, atom, getDefaultStore } from "jotai"
import { atomFamily, atomWithStorage, createJSONStorage } from "jotai/utils"
import type { Address } from "viem"
import { emitUserUpdate } from "#src/utils/emitUserUpdate.ts"
import { StorageKey } from "../services/storage"
import { type AppURL, getAppURL, getIframeURL, isApp, isStandaloneIframe } from "../utils/appURL"
import { getUser, userAtom } from "./user"

// STORE INSTANTIATION
const store = getDefaultStore()

// In EIP-2255, permissions define whether an app can make certain EIP-1193 requests to the wallets.
// These permissions are scoped per app and per account.
//
// The system is not widely adopted and mostly wallet only handles the `eth_accounts` permission,
// which defines whether an app can get the user's account(s) and subsequently make other requests
// (some of which will require confirmations, like `eth_sendTransaction`, some of which won't like
// `eth_call`).
//
// Like other wallets, we only handle the `eth_accounts` permission, but we support processing
// all incoming permission requests.
//
// References:
// https://eips.ethereum.org/EIPS/eip-2255

/**
 * Maps an user + app pair to a {@link AppPermissions}, which is the set of permissions
 * for that user on that app.
 */
export type PermissionsMap = Record<Address, Record<AppURL, AppPermissions>>

/**
 * Maps permissions names to permission objects.
 * EIP-2255 specifies that permissions names must be EIP-1193 request names (e.g. `eth_accounts`).
 * However, we type this as a string in case we want to extend the permission system to other
 * names that do not map to a request (or are custom requests).
 */
export type AppPermissions = Record<string, WalletPermission>

/**
 * Permission object for a specific permission.
 *
 * This type is copied from Viem (eip1193.ts)
 */
export type WalletPermission = {
    // The app to which the permission is granted.
    invoker: HTTPString
    // This is the EIP-1193 request that this permission is mapped to.
    parentCapability: "eth_accounts" | string // TODO only string or make specific
    caveats: WalletPermissionCaveat[]
    date: number
    // Not in the EIP, but Viem wants this.
    id: UUID
}

/**
 * A caveat is a specific specific restrictions applied to the permitted request.
 */
type WalletPermissionCaveat = {
    type: string
    value: unknown
}

/**
 * A request for one or more permissions.
 */
export type PermissionRequestObject = {
    [requestName: string]: { [caveatName: string]: unknown }
}

/**
 * A permissions specifier, which can be either a single EIP-1193 request name, or a {@link
 * PermissionRequestObject}.
 */
export type PermissionsRequest = string | PermissionRequestObject

/**
 * Maps an user + app pair to a {@link AppPermissions}, which is the set of permissions
 * for that user on that app.
 */
export const permissionsMapAtom = atomWithStorage<PermissionsMap>(StorageKey.UserPermissions, {}, createJSONStorage(), {
    getOnInit: true,
})

type PermissionCheckParams = {
    permissionsRequest: PermissionsRequest
    app: AppURL
}

const _atomForPermissionsCheck: (params: PermissionCheckParams) => Atom<boolean> = //
    atomFamily(({ permissionsRequest, app }) => {
        return atom((get) => {
            const user = get(userAtom)
            if (!user) return false
            // This call *might* be required to record the dependency, which occurs via
            // `getDefaultStore().get` during `hasPermissions`.
            get(permissionsMapAtom)
            return hasPermissions(app, permissionsRequest)
        })
    })

/**
 * A function that returns a new atom that subscribes to a check on the specified permissions.
 *
 * The atom is cached, but not automatically garbage-collected. If this is called with a changing
 * set of permissions, it is necessary to call `atomForPermissionsCheck.remove(oldPermissions)`
 * when changing the permissions!
 */
export function atomForPermissionsCheck(
    permissionsRequest: PermissionsRequest, //
    app: AppURL = getAppURL(),
): Atom<boolean> {
    return _atomForPermissionsCheck({ permissionsRequest, app })
}

// === GET ALL PERMISSIONS =======================================================================================

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

// === WRITE ALL PERMISSIONS =======================================================================================

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
export function grantPermissions(app: AppURL, permissionRequest: PermissionsRequest): WalletPermission[] {
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
        if (name === "eth_accounts" && isApp(app) && !isStandaloneIframe()) {
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
