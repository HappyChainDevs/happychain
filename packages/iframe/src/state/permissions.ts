import type { HTTPString, UUID } from "@happychain/common"
import { type Atom, atom } from "jotai"

import { atomFamily, atomWithStorage, createJSONStorage } from "jotai/utils"
import type { Address } from "viem"
import { hasPermissions } from "../services/permissions"
import { StorageKey } from "../services/storage"
import { type AppURL, getAppURL } from "../utils/appURL"
import { userAtom } from "./user"

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
 * We do not support any caveats at the moment.
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
