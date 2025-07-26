import type { Address } from "@happy.tech/common"
import { PermissionName } from "#src/constants/permissions"
import type { AppURL } from "#src/utils/appURL"

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
    type: "WalletPermissions"
    // The user to which the permission is granted.
    user: Address
    // The app to which the permission is granted.
    invoker: AppURL
    // This is the EIP-1193 request that this permission is mapped to.
    parentCapability: PermissionName | (string & {})
    caveats: WalletPermissionCaveat[]
    date: number
    // Not in the EIP, but Viem wants this.
    id: string
    // Required by the sync service.
    updatedAt: number
    createdAt: number
    deleted: boolean
}

/**
 * A caveat is a specific specific restrictions applied to the permitted request.
 */
export type WalletPermissionCaveat = {
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
 * A refinement of {@link PermissionRequestObject} for requesting session keys.
 */
export type SessionKeyRequest = {
    [PermissionName.SessionKey]: { target: Address }
}

/**
 * A permissions specifier, which can be either a single EIP-1193 request name, or a {@link
 * PermissionRequestObject}.
 */
export type PermissionsRequest = string | PermissionRequestObject
