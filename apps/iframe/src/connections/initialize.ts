import { happyProviderInfo, injectedProviderInfo } from "@happy.tech/common"
import { type ConnectionProvider, type EIP6963ProviderDetail, Msgs } from "@happy.tech/wallet-common"
import { atom, getDefaultStore, useAtomValue } from "jotai"
import { createStore } from "mipd"
import { useMemo } from "react"
import { appMessageBus } from "#src/services/eventBus"
import { isStandaloneWallet } from "#src/utils/appURL"
import { userAtom } from "../state/user"
import { GoogleConnector } from "./GoogleConnector"
import { InjectedConnector } from "./InjectedConnector"
import { InjectedProviderProxy } from "./InjectedProviderProxy"

const store = getDefaultStore()

const connectionProvidersAtom = atom<Record<string, ConnectionProvider>>({})

const UNSUPPORTED_WALLETS = [
    // These wallets are not supported by the app,
    // or should not be listed as available connection providers.
    happyProviderInfo.rdns,
    "app.phantom",
]
// create a simple RDNS set here so that providers can't be added multiple times,
// even if they announce themselves multiple times
const createdInjectors = new Set<string>()

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

// === SOCIAL PROVIDERS ============================================================================

addProvider(new GoogleConnector())

// === INJECTED PROVIDERS ==========================================================================

/**
 * If the wallet is in standalone mode, then we can consume EIP-6963 events directly. However
 * if the wallet is embedded, then there are situations where these events, as well as injected
 * wallest such as window.ethereum are shielded from us, preventing us from detecting them.
 */
if (isStandaloneWallet()) {
    const mipdStore = createStore()
    // load all initialized providers
    mipdStore.getProviders().forEach((detail) => {
        if (UNSUPPORTED_WALLETS.includes(detail.info.rdns)) return
        if (createdInjectors.has(detail.info.rdns)) return
        createdInjectors.add(detail.info.rdns)
        addProvider(new InjectedConnector({ ...detail, autoConnect: true }))
    })
    // subscribe to any async changes
    mipdStore.subscribe((details, meta) => {
        for (const detail of details) {
            if (UNSUPPORTED_WALLETS.includes(detail.info.rdns)) return
            if (meta?.added) {
                if (createdInjectors.has(detail.info.rdns)) return
                createdInjectors.add(detail.info.rdns)
                addProvider(new InjectedConnector({ ...detail, autoConnect: true }))
            } else if (meta?.removed) {
                createdInjectors.delete(detail.info.rdns)
                removeProvider(new InjectedConnector({ ...detail, autoConnect: false }))
            }
        }
    })
    if (window.ethereum) {
        addProvider(
            new InjectedConnector({
                info: injectedProviderInfo,
                provider: window.ethereum,
                autoConnect: true,
            }),
        )
    }
} else {
    // Instead of listening to the EIP-6963 events inside the happy-wallet, the app listens to them
    // and forwards them here, as not every injected wallet will allow itself to be
    // injected into iframes.
    appMessageBus.on(Msgs.AnnounceInjectedProvider, (detail) => {
        if (UNSUPPORTED_WALLETS.includes(detail.info.rdns)) return
        if (createdInjectors.has(detail.info.rdns)) return
        createdInjectors.add(detail.info.rdns)
        addProvider(
            new InjectedConnector({
                info: detail.info,
                provider: InjectedProviderProxy.getInstance() as EIP6963ProviderDetail["provider"],
                autoConnect: true,
            }),
        )
    })
}

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
