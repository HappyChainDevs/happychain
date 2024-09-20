import type { HTTPString } from "@happychain/common"
import type { UUID } from "@happychain/sdk-shared"
import { atom } from "jotai"

import { atomFamily, atomWithStorage } from "jotai/utils"
import type { Address } from "viem"
import { getDappPermissions, hasPermissions } from "../services/permissions"
import { StorageKey } from "../services/storage"
import { createMapStorage } from "../utils/createMapJSONStorage"
import { userAtom } from "./user.ts"

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

export type UserAndApp = `${Address}|${HTTPString}`

/**
 * Maps an user + app pair to a {@link AppPermissions}, which is the set of permissions
 * for that user on that app.
 */
export type PermissionsMap = Map<UserAndApp, AppPermissions>

/**
 * Maps EIP-2255 EIP-1193 requests (like `eth_accounts`) to a permission object.
 */
export type AppPermissions = Map<string, WalletPermission>

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
 * We do not support any caveats at the moment.
 */
type WalletPermissionCaveat = {
    type: string
    value: unknown
}

/**
 * A request for permissions on a specific EIP-1193 request.
 */
export type PermissionRequest = {
    [requestName: string]: { [caveatName: string]: unknown }
}

/**
 * A permissions specifier, which can be either a single EIP-1193 request name, or a {@link
 * PermissionRequest}.
 */
export type PermissionsSpec = string | PermissionRequest

export const permissionsAtom = atomWithStorage<PermissionsMap>(
    StorageKey.UserPermissions,
    new Map(),
    createMapStorage(),
    { getOnInit: true },
)

/**
 * A function that returns a new atom that subscribes to a check on the specified permissions.
 *
 * The atom is cached, but not automatically garbage-collected. If this is called with a changing
 * set of permissions, it is necessary to call `atomForPermissionsCheck.remove(oldPermissions)`
 * when changing the permissions!
 */
export const atomForPermissionsCheck = atomFamily((permissions: PermissionsSpec) => {
    return atom((get) => {
        const user = get(userAtom)
        if (!user) return false
        const permissionsMap = getDappPermissions(user, get(permissionsAtom))
        return hasPermissions(permissions, permissionsMap)
    })
})
