import { happyProviderInfo, injectedProviderInfo } from "@happychain/common"
import { type ConnectionProvider, type EIP6963ProviderDetail, Msgs } from "@happychain/sdk-shared"
import { atom, getDefaultStore, useAtomValue } from "jotai"
import { createStore } from "mipd"
import { useMemo } from "react"
import { appMessageBus } from "#src/services/eventBus.ts"
import { isStandaloneIframe } from "#src/utils/appURL.ts"
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

// === SOCIAL PROVIDERS ============================================================================

addProvider(new GoogleConnector())

// === INJECTED PROVIDERS ==========================================================================

/**
 * If the wallet is in standalone mode, then we can consume EIP-6963 events directly. However
 * if the wallet is embedded, then there are situations where these events, as well as injected
 * wallest such as window.ethereum are shielded from us, preventing us from detecting them.
 */
if (isStandaloneIframe()) {
    const mipdStore = createStore()

    // load all initialized providers
    mipdStore.getProviders().forEach((detail) => {
        if (detail.info.rdns === happyProviderInfo.rdns) return
        addProvider(new InjectedConnector({ ...detail, autoConnect: true }))
    })

    // subscribe to any async changes
    mipdStore.subscribe((details, meta) => {
        for (const detail of details) {
            if (detail.info.rdns === happyProviderInfo.rdns) continue
            if (meta?.added) {
                addProvider(new InjectedConnector({ ...detail, autoConnect: true }))
            } else if (meta?.removed) {
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
    // listen to message bus instead of window here because when embedded, in many situations, the
    // providers will not be detected. Duplicates are fine as we use the provider.id as the unique key
    appMessageBus.on(Msgs.EIP6963RequestProvider, (provider) => {
        if (provider.info.rdns === happyProviderInfo.rdns) return
        addProvider(
            new InjectedConnector({
                info: provider.info,
                provider: {
                    // The following TODO: s are left to be upgraded after
                    // https://github.com/HappyChainDevs/happychain/pull/233 is merged.
                    // This connection receiver will likely need to be re-worked, however this is the
                    // path forward for wiring up injected browser events

                    // TODO:
                    removeListener: () => {},
                    /** TODO: */
                    on: () => {},
                    /** TODO: */
                    request: () => {},
                } as unknown as EIP6963ProviderDetail["provider"],
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
