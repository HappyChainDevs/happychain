import { AuthState, type ConnectionProvider, type EIP6963ProviderDetail, Msgs } from "@happychain/sdk-shared"
import { useSetAtom } from "jotai"
import { useEffect, useMemo, useState } from "react"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { appMessageBus } from "../services/eventBus"
import { StorageKey, storage } from "../services/storage"
import { authStateAtom } from "../state/authState"
import { grantPermissions, revokePermissions } from "../state/permissions"
import { getAppURL } from "../utils/appURL"
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
        return appMessageBus.on(Msgs.InjectedWalletConnected, ({ rdns, address }) => {
            const user = rdns ? createHappyUserFromWallet(rdns, address) : undefined
            setUserWithProvider(user, undefined)
        })
    }, [])

    return useMemo(
        () =>
            Array.from(injectedProviders.values()).map((eip1193Provider) => {
                return {
                    type: "injected",
                    id: `injected:${eip1193Provider.info.rdns}`,
                    name: eip1193Provider.info.name,
                    icon: eip1193Provider.info.icon,
                    connect: async () => {
                        // will automatically disable loading state when user+provider are set
                        setAuthState(AuthState.Connecting)
                        await enable(eip1193Provider)
                    },
                    disconnect: async () => {
                        // will automatically disable loading state when user+provider are set
                        setAuthState(AuthState.Connecting)
                        await disable(eip1193Provider)
                    },
                } satisfies ConnectionProvider
            }),
        [setAuthState, injectedProviders],
    )
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
        // Whenever the app makes a permissions request to the injected wallet, it will also
        // forward the request and response to the iframe so that we can mirror the permission.
        return appMessageBus.on(Msgs.MirrorPermissions, ({ request, response }) => {
            const hasResponse = Array.isArray(response) && response.length
            const app = getAppURL()
            switch (request.method) {
                case "eth_accounts":
                case "eth_requestAccounts":
                    // Revoke the eth_accounts permission if the response is empty.
                    // biome-ignore format: readability
                    hasResponse
                      ? grantPermissions(app, "eth_accounts")
                      : revokePermissions(app, "eth_accounts")
                    return

                case "wallet_requestPermissions":
                    // We only handle the eth_accounts permission for now, but there is no harm in
                    // setting the permissions that the user has authorized, since we either will be
                    // more permissive (e.g. allow methods only on the basis of eth_accounts and
                    // user approval) or do not support the capability the permission relates to.
                    hasResponse && grantPermissions(app, request.params[0])
                    return

                case "wallet_revokePermissions":
                    request.params && revokePermissions(app, request.params[0])
                    return
            }
        })
    }, [])

    return { providers }
}

const enable = async (eip1193Provider: EIP6963ProviderDetail) => {
    if (IsInIframe) {
        void appMessageBus.emit(Msgs.InjectedWalletRequestConnect, { rdns: eip1193Provider.info.rdns })
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
        void appMessageBus.emit(Msgs.InjectedWalletRequestConnect, { rdns: undefined })
        setUserWithProvider(undefined, undefined)
    }
}
