import type { ConnectionProvider, EIP6963ProviderDetail } from "@happychain/sdk-shared"
import { AuthState } from "@happychain/sdk-shared"
import { useSetAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"

import { setUserWithProvider } from "../actions/setUserWithProvider"
import { dappMessageBus } from "../services/eventBus"
import { StorageKey, storage } from "../services/storage"
import { authStateAtom } from "../state/authState"
import { createHappyUserFromWallet } from "../utils/createHappyUserFromWallet"
import { isEip6963Event } from "../utils/isEip6963Event"

const IsInIframe = window.parent !== window

type ProviderMap = Map<string, EIP6963ProviderDetail>

export function useInjectedProviders(): ConnectionProvider[] {
    const setAuthState = useSetAtom(authStateAtom)

    // user injected browser extensions
    const { providers: injectedProviders } = useRequestEIP6963Providers()

    // front end dapp connected via injected wallet
    useEffect(() => {
        return dappMessageBus.on("injected-wallet:connect", ({ rdns, address }) => {
            const user = rdns ? createHappyUserFromWallet(rdns, address) : undefined
            setUserWithProvider(user, undefined)
        })
    }, [])

    const providers = useMemo(
        () =>
            Array.from(injectedProviders.values()).map((eip1193Provider) => {
                return {
                    type: "injected",
                    id: `injected:${eip1193Provider.info.rdns}`,
                    name: eip1193Provider.info.name,
                    icon: eip1193Provider.info.icon,
                    enable: async () => {
                        // will automatically disable loading state when user+provider are set
                        setAuthState(AuthState.Connecting)
                        await enable(eip1193Provider)
                    },
                    disable: async () => {
                        // will automatically disable loading state when user+provider are set
                        setAuthState(AuthState.Connecting)
                        await disable(eip1193Provider)
                    },
                }
            }),
        [setAuthState, injectedProviders],
    )

    return providers
}

function useRequestEIP6963Providers() {
    const [providers, setInjectedProviders] = useState<ProviderMap>(new Map())

    useEffect(() => {
        window.dispatchEvent(new CustomEvent("eip6963:requestProvider"))
    }, [])

    useEffect(() => {
        const callback = async (evt: Event) => {
            if (!isEip6963Event(evt)) return

            setInjectedProviders((map) => new Map(map.set(evt.detail.info.uuid, evt.detail)))

            // autoconnect
            const user = storage.get(StorageKey.HappyUser)
            if (user?.provider === evt.detail.info.rdns) {
                enable(evt.detail)
            }
        }

        window.addEventListener("eip6963:announceProvider", callback)
        return () => window.removeEventListener("eip6963:announceProvider", callback)
    }, [])

    return { providers }
}

const enable = async (eip1193Provider: EIP6963ProviderDetail) => {
    if (IsInIframe) {
        dappMessageBus.emit("injected-wallet:requestConnect", eip1193Provider.info.rdns)
    } else {
        const [address] = await eip1193Provider.provider.request({ method: "eth_requestAccounts" })
        const user = createHappyUserFromWallet(eip1193Provider.info.rdns, address)
        setUserWithProvider(user, eip1193Provider.provider)
    }
}

const disable = async (eip1193Provider: EIP6963ProviderDetail) => {
    const past = storage.get(StorageKey.HappyUser)

    if (past?.provider === eip1193Provider.info.rdns) {
        dappMessageBus.emit("injected-wallet:requestConnect", undefined)
        setUserWithProvider(undefined, undefined)
    }
}
