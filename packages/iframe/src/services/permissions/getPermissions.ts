import type { WalletPermission, WalletPermissionRequest } from "../../state/permissions"
import { getDappPermissions } from "./utils"

type WalletGetPermissions = { method: "wallet_getPermissions"; params?: unknown }
type WalletRequestPermissions = { method: "wallet_requestPermissions"; params: WalletPermissionRequest[] }
type Params = WalletGetPermissions | WalletRequestPermissions

/**
 * Response to JSON-RPC requests
 * - wallet_getPermissions
 * - wallet_requestPermissions
 */
export function getPermissions({ method, params }: Params): WalletPermission[] {
    const dappPermissions = getDappPermissions()
    if (!dappPermissions.size) return []

    if (method === "wallet_getPermissions") {
        return Array.from(dappPermissions.values())
    }

    if (method === "wallet_requestPermissions" && Array.isArray(params)) {
        const perms: WalletPermission[] = []
        for (const param of params) {
            const [[name]] = Object.entries(param)
            const permission = dappPermissions.get(name)
            if (permission) {
                perms.push(permission)
            }
        }
        return perms
    }

    return []
}
