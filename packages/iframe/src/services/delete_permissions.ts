import { getDefaultStore } from "jotai/vanilla"
import { type WalletPermission, permissionsAtom } from "../state/permissions"
import { userAtom } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"
import { getDappOrigin } from "../utils/getDappOrigin"

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

const dappOrigin = getDappOrigin()
const store = getDefaultStore()

type WalletPermissionRequest = {
    [methodName: string]: WalletPermissionCaveatRequest
}

type WalletPermissionCaveatRequest = {
    [caveatName: string]: unknown
}

function createWalletPermission(name: "eth_accounts" | string): WalletPermission {
    return {
        caveats: [],
        id: crypto.randomUUID(),
        date: Date.now(),
        invoker: dappOrigin,
        parentCapability: name,
    }
}

function getDappPermissions() {
    return store.get(permissionsAtom)?.get(dappOrigin) ?? new Map<string, WalletPermission>()
}

function hasPermission(...permissions: WalletPermissionRequest[]) {
    const referrer = getDappPermissions()
    if (!referrer.size || !permissions.length) return false

    return permissions.every((param) => {
        const [[name]] = Object.entries(param)
        return referrer.has(name)
    })
}

/**
 * Action for JSON-RPC request
 * - wallet_requestPermissions
 *
 * @return WalletPermissions
 */
function setPermission({ method, params }: { method: string; params: WalletPermissionRequest[] }) {
    const referrer = getDappPermissions()

    if (method === "eth_requestAccounts") {
        // store permissions for future
        referrer.set("eth_accounts", createWalletPermission("eth_accounts"))
        emitUserUpdate(store.get(userAtom))
    }

    if (method === "wallet_requestPermissions") {
        for (const param of params) {
            const [[name, value]] = Object.entries(param)

            if (value && typeof value === "object" && Object.keys(value).length) {
                throw new Error("WalletPermissionCaveats Not Yet Supported")
            }

            referrer.set(name, createWalletPermission(name))

            if (name === "eth_accounts") {
                // allow dapp to access user
                emitUserUpdate(store.get(userAtom))
            }
        }
    }

    store.set(permissionsAtom, (prev) => prev.set(dappOrigin, referrer))
}

/**
 * Response to JSON-RPC requests
 * - wallet_getPermissions
 * - wallet_requestPermissions
 */
type WalletGetPermissions = { method: "wallet_getPermissions"; params: unknown }
type WalletRequestPermissions = { method: "wallet_requestPermissions"; params: WalletPermissionRequest[] }
function getPermissions({
    method,
    params,
}: WalletGetPermissions | WalletRequestPermissions | { method: string; params?: unknown }): WalletPermission[] {
    const referrer = getDappPermissions()
    if (!referrer.size) return []

    if (method === "wallet_getPermissions") {
        return Array.from(referrer.values())
    }

    if (method === "wallet_requestPermissions" && Array.isArray(params)) {
        const perms: WalletPermission[] = []
        for (const param of params) {
            const [[name]] = Object.entries(param)
            const permission = referrer.get(name)
            if (permission) {
                perms.push(permission)
            }
        }
        return perms
    }

    return []
}

/**
 * Response to JSON-RPC requests
 * - wallet_revokePermissions
 */
function revokePermission({ method, params }: { method: string; params: { [key: string]: unknown }[] }) {
    const referrer = getDappPermissions()
    if (!referrer.size) return []

    if (method === "wallet_revokePermissions") {
        for (const param of params) {
            const [[name]] = Object.entries(param)
            referrer.delete(name)
            if (name === "eth_accounts") {
                emitUserUpdate(undefined)
            }
        }
    }

    store.set(permissionsAtom, (prev) => {
        if (referrer.size) {
            prev.set(dappOrigin, referrer)
            return prev
        }

        prev.delete(dappOrigin)
        return prev
    })
}

/**
 * Util Shortcut to clear state for current dapp
 */
function clearPermissions() {
    store.set(permissionsAtom, (prev) => {
        // if the current dapp already has account permissions, clear them
        if (hasPermission({ eth_accounts: {} })) {
            emitUserUpdate(undefined)
        }

        // delete all permissions
        prev.delete(dappOrigin)
        return prev
    })
}

export { hasPermission, getPermissions, revokePermission, setPermission, clearPermissions }
