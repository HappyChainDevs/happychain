import { type HappyUser, createUUID } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import {
    type DappPermissionMap,
    type GlobalPermissionMap,
    type WalletPermission,
    permissionsAtom,
} from "../../state/permissions"

import { getDappOrigin, getIframeOrigin } from "../../utils/getDappOrigin"

const store = getDefaultStore()

const iframeOrigin = getIframeOrigin()
const dappOrigin = getDappOrigin()
const sameOrigin = dappOrigin === iframeOrigin

export function getPermissionsForDapp(
    dappOrigin: string,
    user: HappyUser | undefined,
    permissions: GlobalPermissionMap,
) {
    const fallback = user && sameOrigin ? createIframePermissions() : new Map()
    return permissions.get(dappOrigin) ?? fallback
}

// === Vanilla-JS Accessors =======================================================================================
// This will not be reactive from within react context, please use hooks!
// these util functions are using getDefaultStore() as there are situations
// where these need to be set outside of react context

export function setDappPermissions(permissions: DappPermissionMap) {
    return store.set(permissionsAtom, (prev) => {
        prev.set(dappOrigin, permissions)
        return new Map(prev)
    })
}

export function clearDappPermissions() {
    return store.set(permissionsAtom, (prev) => {
        prev.delete(dappOrigin)
        return new Map(prev)
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
