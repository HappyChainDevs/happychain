import { useFirebaseWeb3AuthStrategy } from "@happychain/firebase-web3auth-strategy"
import { AuthState, type ConnectionProvider, WalletType } from "@happychain/sdk-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useMemo } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { grantPermissions, hasPermissions } from "../services/permissions"
import { authStateAtom } from "../state/authState"
import { chainsAtom } from "../state/chains"
import { userAtom } from "../state/user"
import { emitUserUpdate } from "../utils/emitUserUpdate"

export function useSocialProviders() {
    const setAuthState = useSetAtom(authStateAtom)
    const userValue = useAtomValue(userAtom)
    const chains = useAtomValue(chainsAtom)

    const { connectAsync, connectors } = useConnect()
    const { disconnectAsync } = useDisconnect()
    const { status } = useAccount()

    const { providers, onAuthChange } = useFirebaseWeb3AuthStrategy()
    useEffect(() => {
        onAuthChange(async (user, provider) => {
            // sync local user+provider state with internal plugin updates
            // not logged in and

            const loggingIn = Boolean(!userValue?.type && user)
            const loggedIn = userValue?.type === WalletType.Social
            if (loggingIn || loggedIn) {
                // Pre-add all our supported chains (as defined by sdk-shared).
                if (provider) {
                    await Promise.allSettled(
                        Object.values(chains).map((chain) => {
                            provider.request({ method: "wallet_addEthereumChain", params: [chain] })
                        }),
                    )
                }

                setUserWithProvider(user, provider)

                // must go after setUserProvider
                if (status !== "connected") {
                    await connectAsync({ connector: connectors[0] })
                }

                // the user is automatically sent to the front when the user
                // changes or when the permissions change, however on page-load-reconnect
                // neither of these change, and we need to manually send here
                if (loggedIn && hasPermissions("eth_accounts")) {
                    emitUserUpdate(user)
                }
            }
        })
    }, [onAuthChange, userValue, chains, connectAsync, connectors, status])

    const providersMemo = useMemo(
        () =>
            providers.map(
                (provider) =>
                    ({
                        ...provider,
                        enable: async () => {
                            // will automatically disable loading state when user+provider are set
                            setAuthState(AuthState.Connecting)
                            await provider.enable()
                            grantPermissions("eth_accounts")
                        },
                        disable: async () => {
                            // will automatically disable loading state when user+provider are set
                            setAuthState(AuthState.Connecting)
                            await provider.disable()
                            await disconnectAsync()
                        },
                    }) satisfies ConnectionProvider,
            ),
        [providers, setAuthState, disconnectAsync],
    )

    return providersMemo
}
