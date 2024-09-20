import type { HappyUser } from "@happychain/sdk-shared"
import type { DappPermissionMap, WalletPermission, WalletPermissionRequest } from "../../state/permissions"
import { emitUserUpdate } from "../../utils/emitUserUpdate"
import { createWalletPermission, setDappPermissions } from "./utils"

export function getPermissionAction(
    permissions: WalletPermissionRequest[],
    dappPermissions: DappPermissionMap,
): WalletPermission[] {
    return permissions
        .flatMap((param) => Object.keys(param))
        .map((name) => dappPermissions.get(name))
        .filter((permission) => !!permission)
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

export function setPermissionAction(
    permissions: WalletPermissionRequest[],
    user: HappyUser | undefined,
    dappPermissions: DappPermissionMap,
): WalletPermission[] {
    const grantedPermissions = []
    for (const permission of permissions) {
        const [[name, value]] = Object.entries(permission)
        if (value && typeof value === "object" && Object.keys(value).length) {
            throw new Error("WalletPermissionCaveats Not Yet Supported")
        }

        const grantedPermission = createWalletPermission(name)
        grantedPermissions.push(grantedPermission)
        dappPermissions.set(name, grantedPermission)

        if (name === "eth_accounts") {
            emitUserUpdate(user)
        }
    }

    setDappPermissions(dappPermissions)
    return grantedPermissions
}
