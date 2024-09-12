import type { HappyUser } from "@happychain/sdk-shared"
import type { DappPermissionMap, WalletPermission, WalletPermissionRequest } from "../../state/permissions"
import { emitUserUpdate } from "../../utils/emitUserUpdate"
import { createWalletPermission, setDappPermissions } from "./utils"

/**
 * These 'actions' are permission primitives which
 * are used to simplify usage and build:
 *   - react compatible hooks
 *   - vanillajs helpers for use outside of react land.
 *
 * Beyond that, they are not intended to be used directly.
 *
 * Its acceptable to set values here, or emit events, however
 * any needed data is required to be passed in as parameters
 * as if its retrieved i.e. by getDefaultStore() with jotai,
 * then this will break the reactivity within consuming hooks.
 */

type EthRequestAccounts = { method: "eth_requestAccounts"; params?: unknown }
type WalletRequestPermissions = { method: "wallet_requestPermissions"; params: WalletPermissionRequest[] }
type WalletGetPermissions = { method: "wallet_getPermissions"; params?: unknown }

export type GetPermissionActionParams = WalletGetPermissions | WalletRequestPermissions

export function getPermissionAction(
    { method, params }: GetPermissionActionParams,
    dappPermissions: DappPermissionMap,
): WalletPermission[] {
    if (!dappPermissions.size) return []

    if (method === "wallet_getPermissions") {
        return Array.from(dappPermissions.values())
    }

    if (method === "wallet_requestPermissions" && Array.isArray(params)) {
        return params
            .flatMap((param) => Object.keys(param))
            .map((name) => dappPermissions.get(name))
            .filter((permission): permission is WalletPermission => !!permission)
    }

    return []
}

export function hasPermissionAction(permissions: WalletPermissionRequest[], dappPermissions: DappPermissionMap) {
    if (!dappPermissions.size || !permissions.length) return false

    return permissions.every((param) => {
        const [[name, value]] = Object.entries(param)

        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats Not Yet Supported")
        }

        return dappPermissions.has(name)
    })
}

export function revokePermissionAction(params: { [key: string]: unknown }[], dappPermissions: DappPermissionMap) {
    if (!dappPermissions.size) return []

    for (const param of params) {
        const [[name]] = Object.entries(param)
        dappPermissions.delete(name)
        if (name === "eth_accounts") {
            emitUserUpdate(undefined)
        }
    }

    setDappPermissions(dappPermissions)
}

export type SetPermissionActionParams = EthRequestAccounts | WalletRequestPermissions

export function setPermissionAction(
    { method, params }: SetPermissionActionParams,
    user: HappyUser | undefined,
    dappPermissions: DappPermissionMap,
) {
    if (method === "eth_requestAccounts") {
        // store permissions for future
        dappPermissions.set("eth_accounts", createWalletPermission("eth_accounts"))
        emitUserUpdate(user)
    }

    if (method === "wallet_requestPermissions") {
        for (const param of params) {
            const [[name, value]] = Object.entries(param)
            if (value && typeof value === "object" && Object.keys(value).length) {
                throw new Error("WalletPermissionCaveats Not Yet Supported")
            }

            dappPermissions.set(name, createWalletPermission(name))

            if (name === "eth_accounts") {
                // allow dapp to access user
                emitUserUpdate(user)
            }
        }
    }

    setDappPermissions(dappPermissions)
}
