import { FirebaseConnector, configs } from "@happychain/firebase-web3auth-strategy"
import { AuthState, type ConnectionProvider, type HappyUser, WalletType } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import type { EIP1193Provider } from "viem"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { setAuthState } from "../state/authState"
import { getChains } from "../state/chains"
import { grantPermissions } from "../state/permissions"
import { getUser, userAtom } from "../state/user"
import { getAppURL } from "../utils/appURL"
import { emitUserUpdate } from "../utils/emitUserUpdate"

// NOTE: The above variable needs to exist outside of React because `useSocialProvider` is called in
// the modal, who disappears upon log in, to be taken over by the use of the same hook in /embed.
// This is a big hack, the listener should exist outside of React.

const googleConnector = new FirebaseConnector({
    ...configs.google,
    onConnect,
    onReconnect,
    onDisconnect,
})

const providers = [googleConnector].map(
    (provider) =>
        ({
            ...provider,
            disable: provider.disable,
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
        }) as ConnectionProvider,
)

export function useSocialProviders() {
    const { connectAsync, connectors } = useConnect()
    const { disconnectAsync } = useDisconnect()
    const user = useAtomValue(userAtom)
    const { status: wagmiStatus } = useAccount()
    /**
     * Connect wagmi on user details changing
     */
    useEffect(() => {
        // TODO: this works but applies to injected wallets also, need to decide how to handle injected wallets!
        const init = async () => {
            if (user && wagmiStatus === "disconnected") {
                await connectAsync({ connector: connectors[0] })
            } else if (!user && wagmiStatus === "connected") {
                await disconnectAsync()
            }
        }
        init()
    }, [user, connectAsync, connectors, disconnectAsync, wagmiStatus])

    return providers
}

/**
 * default onAuthChange actions. all social providers will likely use the same
 */
async function onDisconnect(_: undefined, provider: EIP1193Provider) {
    if (getUser()?.type !== WalletType.Social) return
    setUserWithProvider(undefined, provider)
    setAuthState(AuthState.Disconnected)
    // TODO: remove and centralize emitUserUpdate
    emitUserUpdate(undefined)
}
async function onReconnect(user: HappyUser, provider: EIP1193Provider) {
    setUserWithProvider(user, provider)
    setAuthState(AuthState.Connected)
    // TODO: remove and centralize emitUserUpdate
    emitUserUpdate(user)
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
    grantPermissions(getAppURL(), "eth_accounts")
    setAuthState(AuthState.Connected)
    // TODO: remove and centralize emitUserUpdate
    emitUserUpdate(user)
}
