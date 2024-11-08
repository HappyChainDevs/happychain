import type { ConnectionProvider } from "@happychain/sdk-shared"
import { atom, getDefaultStore, useAtomValue } from "jotai"
import { createStore } from "mipd"
import { useMemo } from "react"
import { userAtom } from "../state/user"
import { GoogleConnector } from "./GoogleConnector"
import { InjectedConnector } from "./InjectedConnector"

const store = getDefaultStore()

const connectionProvidersAtom = atom<Record<string, ConnectionProvider>>({})

// === REACT HOOKS =================================================================================

export function useConnectionProviders() {
    const providers = useAtomValue(connectionProvidersAtom)
    return Object.values(providers)
}
export function useActiveConnectionProvider() {
    const providers = useAtomValue(connectionProvidersAtom)
    const user = useAtomValue(userAtom)
    const activeProvider = useMemo(() => user && providers[user.provider], [user, providers])
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
    store.set(connectionProvidersAtom, (prev) => {
        return {
            ...prev,
            [provider.id]: provider,
        }
    })
}

function removeProvider(provider: ConnectionProvider) {
    store.set(connectionProvidersAtom, (prev) => {
        const { [provider.id]: _deleted, ...rest } = prev
        return rest
    })
}
