import {
    AuthState,
    type ConnectionProvider,
    type EIP6963ProviderDetail,
    Msgs,
    WalletType,
} from "@happychain/sdk-shared"
import { useSetAtom } from "jotai"
import { createStore } from "mipd"
import { useEffect, useMemo, useState } from "react"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { appMessageBus } from "../services/eventBus"
import { grantPermissions, revokePermissions } from "../services/permissions"
import { StorageKey, storage } from "../services/storage"
import { authStateAtom } from "../state/authState"
import { getUser } from "../state/user"
import { createHappyUserFromWallet } from "../utils/createHappyUserFromWallet"
import { getDappOrigin } from "../utils/getDappOrigin"
import { isEip6963Event } from "../utils/isEip6963Event"
const IsInIframe = window.parent !== window

type ProviderMap = Map<string, EIP6963ProviderDetail>

const store = createStore()
export function useInjectedProviders(): ConnectionProvider[] {
    const setAuthState = useSetAtom(authStateAtom)

    // user injected browser extensions
    const { providers: injectedProviders } = useRequestEIP6963Providers()

    // front end dapp connected via injected wallet
    useEffect(() => {
        // const user = getUser()
        // if (user?.type === WalletType.Injected) {
        //     // don't need to check permissions, as injected wallet has full permissions
        //     // since we never manage injected wallet secrets
        //     emitUserUpdate(user)
        // }
        return appMessageBus.on(Msgs.InjectedWalletConnected, ({ rdns, address }) => {
            console.log("we are here becuase we are here")
            const user = rdns ? createHappyUserFromWallet(rdns, address) : undefined
            setUserWithProvider(user, undefined)
            grantPermissions("eth_accounts", { origin: getDappOrigin() })
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
                } as ConnectionProvider
            }),
        [setAuthState, injectedProviders],
    )

    return providers
}

function useRequestEIP6963Providers() {
    const [providers, setInjectedProviders] = useState<ProviderMap>(new Map())

    useEffect(() => {
        function init(details: ReturnType<typeof store.getProviders>) {
            console.log({ details })
            setInjectedProviders((map) => {
                for (const detail of details) {
                    map.set(detail.info.uuid, detail)
                }
                return new Map(map)
            })

            const user = getUser()
            if (user?.type === WalletType.Injected) {
                for (const detail of details) {
                    // auto reconnect

                    if (user.provider === detail.info.rdns) {
                        void enable(detail)
                        break
                    }
                }
            }
        }

        // TODO: why did metamask and the like disappear?
        const details = store.getProviders()

        init(details)

        return store.subscribe(init)
    }, [])

    return { providers }
}

const enable = async (eip1193Provider: EIP6963ProviderDetail) => {
    if (IsInIframe) {
        void appMessageBus.emit(Msgs.InjectedWalletRequestConnect, { rdns: eip1193Provider.info.rdns })
        // const [address] = await iframeInjectedProvider.provider.request({ method: 'eth_requestAccounts' })
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
