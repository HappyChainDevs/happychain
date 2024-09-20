import type { HTTPString } from "@happychain/common"

import { atomWithStorage } from "jotai/utils"
import type { Address } from "viem"
import { StorageKey } from "../services/storage"
import { createMapStorage } from "../utils/createMapJSONStorage"

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

export type UserAndApp = {
    user: Address
    app: HTTPString
}

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
 */
export type WalletPermission = {
    // The app to which the permission is granted.
    invoker: HTTPString
    // This is the EIP-1193 request that this permission is mapped to.
    parentCapability: "eth_accounts" | string // TODO only string or make specific
    caveats: WalletPermissionCaveat[]
}

/**
 * A caveat is a specific specific restrictions applied to the permitted request.
 * We do not support any caveats at the moment.
 */
type WalletPermissionCaveat = {
    type: string
    value: unknown
}

export const permissionsAtom = atomWithStorage<PermissionsMap>(
    StorageKey.UserPermissions,
    new Map(),
    createMapStorage(),
    { getOnInit: true },
)
