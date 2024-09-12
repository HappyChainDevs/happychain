import { createUUID } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { type DappPermissionMap, type WalletPermission, permissionsAtom } from "../../state/permissions"
import { userAtom } from "../../state/user"
import { getDappOrigin, getIframeOrigin } from "../../utils/getDappOrigin"

const iframeOrigin = getIframeOrigin()
const dappOrigin = getDappOrigin()
const store = getDefaultStore()

// === Vanilla-JS Accessors =======================================================================================
// This will not be reactive from within react context, please use hooks!
// these util functions are using getDefaultStore() as there are situations
// where these need to be set outside of react context

export function getDappPermissions(): DappPermissionMap {
    const hasUser = store.get(userAtom)
    const sameOrigin = dappOrigin === iframeOrigin
    const fallback = hasUser && sameOrigin ? createIframePermissions() : new Map()
    return store.get(permissionsAtom).get(dappOrigin) ?? fallback
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

// === Utils =======================================================================================

export function createWalletPermission(name: "eth_accounts" | string): WalletPermission {
    return {
        caveats: [],
        id: createUUID(),
        date: Date.now(),
        invoker: dappOrigin,
        parentCapability: name,
    }
}

// create and approve iframe permissions (always)
const createIframePermissions = (): Map<string, WalletPermission> => {
    const eth_accounts: WalletPermission = {
        invoker: iframeOrigin,
        date: Date.now(),
        id: createUUID(),
        parentCapability: "eth_accounts",
        caveats: [],
    }

    return new Map([["eth_accounts", eth_accounts]])
}
