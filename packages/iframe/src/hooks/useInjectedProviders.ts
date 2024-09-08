import { AuthState, type ConnectionProvider, type EIP6963ProviderDetail, Messages } from "@happychain/sdk-shared"
import { useSetAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"

import { setUserWithProvider } from "../actions/setUserWithProvider"
import { appMessageBus } from "../services/eventBus"
import { revokePermission } from "../services/permissions/revokePermission"
import { setPermission } from "../services/permissions/setPermission"
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
        return appMessageBus.on(Messages.InjectedWalletConnect, ({ rdns, address }) => {
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
                } satisfies ConnectionProvider
            }),
        [setAuthState, injectedProviders],
    )

    return providers
}

function useRequestEIP6963Providers() {
    const [providers, setInjectedProviders] = useState<ProviderMap>(new Map())

    useEffect(() => {
        const callback = async (evt: Event) => {
            if (!isEip6963Event(evt)) return

            setInjectedProviders((map) => new Map(map.set(evt.detail.info.uuid, evt.detail)))

            // autoconnect
            const user = storage.get(StorageKey.HappyUser)
            if (user?.provider === evt.detail.info.rdns) {
                void enable(evt.detail)
            }
        }

        window.addEventListener("eip6963:announceProvider", callback)
        window.dispatchEvent(new CustomEvent("eip6963:requestProvider"))
        return () => window.removeEventListener("eip6963:announceProvider", callback)
    }, [])

    useEffect(() => {
        return appMessageBus.on(Messages.MirrorPermissions, ({ request, response }) => {
            switch (request.method) {
                case "eth_accounts":
                case "eth_requestAccounts": {
                    // if response has addresses, add eth_accounts permission
                    // otherwise revoke it
                    if (!Array.isArray(response) || !response.length) {
                        revokePermission({ eth_accounts: {} })
                        return
                    }

                    setPermission({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
                    return
                }
                case "wallet_requestPermissions":
                    if ("eth_accounts" in request.params[0]) {
                        // we don't support every arbitrary variation, but enable
                        // account permissions at minimum
                        // over sharing here isn't such a big deal, as
                        // the source of information would be the wallet itself
                        // so without permissions, we simple won't have the data available
                        setPermission({ ...request, params: [{ eth_accounts: {} }] })
                    }
                    // if response is successful, enable here also
                    return

                case "wallet_revokePermissions":
                    // if response is successful, revoke here also
                    if (request.params) {
                        revokePermission(...request.params)
                    }
                    return
            }
        })
    }, [])

    return { providers }
}

const enable = async (eip1193Provider: EIP6963ProviderDetail) => {
    if (IsInIframe) {
        void appMessageBus.emit(Messages.InjectedWalletRequestConnect, eip1193Provider.info.rdns)
    } else {
        // stand-alone page
        const [address] = await eip1193Provider.provider.request({ method: "eth_requestAccounts" })
        const user = createHappyUserFromWallet(eip1193Provider.info.rdns, address)
        setUserWithProvider(user, eip1193Provider.provider)
    }
}

const disable = async (eip1193Provider: EIP6963ProviderDetail) => {
    const past = storage.get(StorageKey.HappyUser)

    if (past?.provider === eip1193Provider.info.rdns) {
        void appMessageBus.emit(Messages.InjectedWalletRequestConnect, undefined)
        setUserWithProvider(undefined, undefined)
    }
}
