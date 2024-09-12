import { useFirebaseWeb3AuthStrategy } from "@happychain/firebase-web3auth-strategy"
import { AuthState, type ConnectionProvider, WalletType } from "@happychain/sdk-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useMemo } from "react"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { setPermission } from "../services/permissions"
import { authStateAtom } from "../state/authState"
import { chainsAtom } from "../state/chains"
import { userAtom } from "../state/user"

export function useSocialProviders() {
    const setAuthState = useSetAtom(authStateAtom)
    const userValue = useAtomValue(userAtom)
    const chains = useAtomValue(chainsAtom)

    const { providers, onAuthChange } = useFirebaseWeb3AuthStrategy()

    useEffect(() => {
        onAuthChange(async (user, provider) => {
            // sync local user+provider state with internal plugin updates
            // not logged in and
            const loggingIn = Boolean(!userValue?.type && user)
            const loggedIn = userValue?.type === WalletType.Social
            if (loggingIn || loggedIn) {
                // pre-add all our supported chains (as defined by sdk-shared)
                // Social Auth will come with all required chains ready to go
                // injected wallets, may need to add them manually
                if (provider) {
                    await Promise.allSettled(
                        Object.values(chains).map((chain) => {
                            provider.request({ method: "wallet_addEthereumChain", params: [chain] })
                        }),
                    )
                }
                setUserWithProvider(user, provider)
            }
        })
    }, [onAuthChange, userValue, chains])

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
                            setPermission({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
                        },
                        disable: async () => {
                            // will automatically disable loading state when user+provider are set
                            setAuthState(AuthState.Connecting)
                            await provider.disable()
                        },
                    }) satisfies ConnectionProvider,
            ),
        [providers, setAuthState],
    )

    return providersMemo
}
