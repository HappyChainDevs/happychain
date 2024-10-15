import { type HTTPString, createUUID } from "@happychain/common"
import { type HappyUser, logger } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai/index"
import {
    type AppPermissions,
    type PermissionsMap,
    type PermissionsSpec,
    type WalletPermission,
    permissionsAtom,
} from "../state/permissions"
import { getUser } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"
import { getDappOrigin, getIframeOrigin } from "../utils/getDappOrigin"

// === NOTICE ======================================================================================

// Refer to src/state/permissions.ts for more information on how types are stored / typed.

// === CONSTANTS ===================================================================================

const store = getDefaultStore()

// === UTILS =======================================================================================

type GetDappPermissionOptions = {
    user?: HappyUser | undefined
    origin?: HTTPString
    permissions?: PermissionsMap
}

export type PermissionAccessOptions = {
    /** The URL requesting the permission (either an app or the iframe itself. */
    origin?: HTTPString
    /** The permissions for {@link origin}. */
    dappPermissions?: AppPermissions
}

export function getDappPermissions({
    user = getUser(),
    origin = getDappOrigin(),
    permissions = store.get(permissionsAtom),
}: GetDappPermissionOptions = {}): AppPermissions {
    if (!user) return {}

    const permissionLookupResult = permissions[user.address]?.[origin]

    if (!permissionLookupResult) {
        // Permissions don't exist, create them.
        let basePermissions: AppPermissions

        if (user && origin === getIframeOrigin()) {
            // The iframe is always granted the `eth_accounts` permission.
            const eth_accounts: WalletPermission = {
                invoker: getIframeOrigin(),
                parentCapability: "eth_accounts",
                caveats: [],
                date: Date.now(),
                id: createUUID(),
            }
            basePermissions = { eth_accounts }
        } else {
            basePermissions = {}
        }

        // It's not required to set the permissionsAtom here because the permissions don't actually
        // change (so nothing dependent on the atom needs to update). We just write them to avoid
        // rerunning the above logic on each lookup.
        permissions[user.address] ??= {}
        permissions[user.address][origin] = basePermissions

        return basePermissions
    }

    return permissionLookupResult
}

function setDappPermissions(permissions: AppPermissions): void {
    const user = getUser()
    if (!user) {
        // This should never happen and requires investigating if it does!
        logger.warn("No user found, not setting permissions.")
        return
    }

    store.set(permissionsAtom, (prev) => {
        const values = Object.values(permissions)
        if (!values.length) {
            // a call with empty permissions, will clear
            // all of the connected dapps permissions
            return { ...prev, [getDappOrigin()]: {} }
        }

        // if not all permissions supplied are scoped to the
        // same origin, we will ignore the request as its invalid
        if (!values.every((a) => a.invoker === values[0].invoker)) {
            // this should never happen!
            console.warn("Invalid permission update requested, not setting permissions.")
            return prev
        }

        // All the invokers
        const { invoker } = values[0]
        return {
            ...prev,
            [user.address]: {
                ...prev[user.address],
                [invoker]: permissions,
            },
        }
    })
}

function getPermissionArray(permissions: PermissionsSpec): [string, unknown][] {
    return typeof permissions === "string" ? [[permissions, {}]] : Object.entries(permissions)
}

// === GRANT PERMISSIONS ===========================================================================

/**
 * Grants the given permission(s) for the user and returns the list of granted permissions.
 *
 * @notice Caveats are not yet supported
 */
export function grantPermissions(
    permissions: PermissionsSpec,
    // biome-ignore format: readability
    {
        origin = getDappOrigin(),
        dappPermissions = getDappPermissions({ origin }),
    }: PermissionAccessOptions = {},
): WalletPermission[] {
    const grantedPermissions = []

    for (const [name, value] of getPermissionArray(permissions)) {
        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats Not Yet Supported")
        }

        const grantedPermission = {
            caveats: [],
            invoker: origin,
            parentCapability: name,
            date: Date.now(),
            id: createUUID(),
        }
        grantedPermissions.push(grantedPermission)
        dappPermissions[name] = grantedPermission

        if (name === "eth_accounts" && origin === getDappOrigin()) {
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
    permissions: PermissionsSpec,
    // biome-ignore format: readability
    {
        origin = getDappOrigin(),
        dappPermissions = getDappPermissions({ origin }),
    }: PermissionAccessOptions = {},
): void {
    for (const [name] of getPermissionArray(permissions)) {
        delete dappPermissions[name]
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
    permissions: PermissionsSpec,
    // biome-ignore format: readability
    {
        origin = getDappOrigin(),
        dappPermissions = getDappPermissions({ origin }),
    }: PermissionAccessOptions = {},
): boolean {
    return getPermissionArray(permissions).every(([name, value]) => {
        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats not yet supported")
        }
        return name in dappPermissions
    })
}

/**
 * Return all of the user's permissions.
 */
export function getAllPermissions(
    // biome-ignore format: readability
    {
        origin = getDappOrigin(),
        dappPermissions = getDappPermissions({ origin }),
    }: PermissionAccessOptions = {},
): WalletPermission[] {
    return Array.from(Object.values(dappPermissions))
}

// === QUERY PERMISSIONS (WITH CAVEATS) ============================================================

/**
 * Returns the given permission(s). This only considers the keys of the permission object,
 * and returns an aray that contains the permission only if it is granted, along with its caveats.
 */
export function getPermissions(
    permissions: PermissionsSpec,
    // biome-ignore format: readability
    {
        origin = getDappOrigin(),
        dappPermissions = getDappPermissions({ origin }),
    }: PermissionAccessOptions = {},
): WalletPermission[] {
    return getPermissionArray(permissions)
        .map(([name]) => dappPermissions[name])
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
        const { [user.address]: _, ...rest } = prev
        return rest
    })
}
