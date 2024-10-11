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

// Whether to grant the eth_accounts permission upon login.
// Set whenever the user logins on the current dapp explicit, not when he is automatically
// logged in in the iframe from having previously logged in on a different dapp.
const needsImplicitConnectionPerm = { current: false }

// NOTE: The above variable needs to exist outside of React because `useSocialProvider` is called in
// the modal, who disappears upon log in, to be taken over by the use of the same hook in /embed.
// This is a big hack, the listener should exist outside of React.

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

                if (loggedIn) {
                    if (needsImplicitConnectionPerm.current) {
                        grantPermissions("eth_accounts")
                        emitUserUpdate(user)
                    } else if (hasPermissions("eth_accounts")) {
                        // The user is automatically sent to the app whenever the user changes or
                        // when the eth_accounts permission is granted. However, if reconnecting on
                        // page load, neither of these change, and we need to manually send here.
                        emitUserUpdate(user)
                    }
                }
            }
        })
    }, [onAuthChange, userValue, chains, connectAsync, connectors, status])

    // Returns the provider list with patched enable() / disable() functions.
    return useMemo(
        () =>
            providers.map(
                (provider) =>
                    ({
                        ...provider,
                        enable: async () => {
                            // Will automatically disable loading state when user+provider are set.
                            setAuthState(AuthState.Connecting)
                            // We're logging in on the current dapp, grant connection permission.
                            needsImplicitConnectionPerm.current = true
                            await provider.enable()
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
}
