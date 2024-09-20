import { atomWithStorage } from "jotai/utils"

import { accessorsFromAtom } from "@happychain/common/lib/utils/jotai"
import { StorageKey } from "../services/storage"
import { createMapStorage } from "../utils/createMapJSONStorage"

/**
 * Wallet Permission System Handling
 * https://eips.ethereum.org/EIPS/eip-2255
 * https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md
 */

/**
 * Map<dappOrigin, Map<PermissionName, WalletPermission>>
 * permissionName is 'eth_accounts' | string
 * permissionDetails is a WalletPermission
 *
 * This is scoped to the current user, and is cleared when
 * the user logs out
 *
 * In a multi-account scenario, these permissions will need to be scoped
 * per _address_
 */
export type DappPermissionMap = Map<string, WalletPermission>
export type GlobalPermissionMap = Map<string, DappPermissionMap>

type WalletPermissionCaveat = {
    type: string
    value: unknown
}

export type WalletPermissionRequest = {
    // Note: only a single method name is allowed.
    [methodName: string]: WalletPermissionCaveatRequest
}

type WalletPermissionCaveatRequest = {
    [caveatName: string]: unknown
}

export type WalletPermission = {
    invoker: `http://${string}` | `https://${string}`
    date: number
    id: ReturnType<typeof crypto.randomUUID>
    parentCapability: "eth_accounts" | string
    caveats: WalletPermissionCaveat[]
}

export const permissionsAtom = atomWithStorage<GlobalPermissionMap>(
    StorageKey.UserPermissions,
    new Map(),
    createMapStorage(),
    { getOnInit: true },
)
export const { getValue: getPermissions, setValue: setPermissions } = accessorsFromAtom(permissionsAtom)
