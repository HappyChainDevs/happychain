import { FirebaseConnector, configs } from "@happychain/firebase-web3auth-strategy"
import { AuthState, type ConnectionProvider, type HappyUser, WalletType } from "@happychain/sdk-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useMemo } from "react"
import type { EIP1193Provider } from "viem"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { grantPermissions } from "../services/permissions"
import { authStateAtom, setAuthState } from "../state/authState"
import { getChains } from "../state/chains"
import { getUser, userAtom } from "../state/user"
import { getDappOrigin } from "../utils/getDappOrigin"

// signs in automatically
const googleProvider = new FirebaseConnector({
    ...configs.google,
    onConnect: onConnect,
    onReconnect: onReconnect,
    onDisconnect: onDisconnect,
})

const providers = [googleProvider]

export function useSocialProviders() {
    const setAuthState = useSetAtom(authStateAtom)

    const user = useAtomValue(userAtom)
    const { connectAsync, connectors } = useConnect()
    const { disconnectAsync } = useDisconnect()
    const { status } = useAccount()

    /**
     * Connect wagmi on user details changing
     */
    useEffect(() => {
        const init = async () => {
            if (user && status !== "connected") {
                await connectAsync({ connector: connectors[0] })
            } else if (!user && status !== "disconnected") {
                await disconnectAsync()
            }
        }
        init()
    }, [user, connectAsync, connectors, disconnectAsync, status])

    const providersMemo = useMemo(
        () =>
            providers.map(
                (provider) =>
                    ({
                        ...provider,
                        enable: async () => {
                            try {
                                // will automatically disable loading state when user+provider are set
                                setAuthState(AuthState.Connecting)
                                await provider.enable()
                            } catch (e) {
                                setAuthState(AuthState.Disconnected)
                                throw e
                            }
                        },
                        disable: provider.disable,
                    }) as ConnectionProvider,
            ),
        [setAuthState],
    )

    return providersMemo
}

/**
 * default onAuthChange actions. all social providers will likely use the same
 */
async function onDisconnect(_: undefined, provider: EIP1193Provider) {
    if (getUser()?.type !== WalletType.Social) return
    setUserWithProvider(undefined, provider)
    setAuthState(AuthState.Disconnected)
}
async function onReconnect(user: HappyUser, provider: EIP1193Provider) {
    setUserWithProvider(user, provider)
    setAuthState(AuthState.Connected)
}
async function onConnect(user: HappyUser, provider: EIP1193Provider) {
    if (user && provider) {
        await Promise.allSettled(
            Object.values(getChains()).map((chain) => {
                provider.request({ method: "wallet_addEthereumChain", params: [chain] })
            }),
        )
    }
    setUserWithProvider(user, provider)
    grantPermissions("eth_accounts", { origin: getDappOrigin() })
    setAuthState(AuthState.Connected)
}
