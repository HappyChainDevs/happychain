import { createUUID } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { type DappPermissionMap, type WalletPermission, permissionsAtom } from "../../state/permissions"
import { getDappOrigin } from "../../utils/getDappOrigin"

const dappOrigin = getDappOrigin()
const store = getDefaultStore()

export function getDappPermissions(): DappPermissionMap {
    return store.get(permissionsAtom).get(dappOrigin) ?? new Map()
}

export function setDappPermissions(permissions: DappPermissionMap) {
    return store.set(permissionsAtom, (prev) => prev.set(dappOrigin, permissions))
}

export function clearDappPermissions() {
    return store.set(permissionsAtom, (prev) => {
        prev.delete(dappOrigin)
        return prev
    })
}

export function createWalletPermission(name: "eth_accounts" | string): WalletPermission {
    return {
        caveats: [],
        id: createUUID(),
        date: Date.now(),
        invoker: dappOrigin,
        parentCapability: name,
    }
}
