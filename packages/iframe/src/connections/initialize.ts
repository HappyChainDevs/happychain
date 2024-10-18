import type { ConnectionProvider } from "@happychain/sdk-shared"
import { atom, getDefaultStore, useAtomValue } from "jotai"
import { createStore } from "mipd"
import { useMemo } from "react"
import { userAtom } from "../state/user"
import { GoogleConnector } from "./GoogleConnector"
import { InjectedConnector } from "./InjectedConnector"

const store = getDefaultStore()

const connectionProvidersAtom = atom<ConnectionProvider[]>([])

// === REACT HOOKS =================================================================================

export function useConnectionProviders() {
    return useAtomValue(connectionProvidersAtom)
}
export function useActiveConnectionProvider() {
    const providers = useAtomValue(connectionProvidersAtom)
    const user = useAtomValue(userAtom)
    const activeProvider = useMemo(() => user && providers.find((a) => a.id === user.provider), [user, providers])
    return activeProvider
}

// === INJECTED PROVIDERS ==========================================================================

const mipdStore = createStore()

// load all initialized providers
mipdStore.getProviders().forEach((detail) => {
    addProvider(new InjectedConnector({ ...detail, autoConnect: true }))
})

// subscribe to any async changes
mipdStore.subscribe((details, meta) => {
    for (const detail of details) {
        if (meta?.added) {
            addProvider(new InjectedConnector({ ...detail, autoConnect: true }))
        } else if (meta?.removed) {
            removeProvider(new InjectedConnector({ ...detail, autoConnect: false }))
        }
    }
})

// === SOCIAL PROVIDERS ============================================================================

addProvider(new GoogleConnector())

// === JOTAI UTILS =================================================================================

function addProvider(provider: ConnectionProvider) {
    store.set(connectionProvidersAtom, (prev) => prev.concat(provider))
}

function removeProvider(provider: ConnectionProvider) {
    store.set(connectionProvidersAtom, (prev) => prev.filter((p) => p.id !== provider.id))
}
