import { useFirebaseWeb3AuthStrategy } from "@happychain/firebase-web3auth-strategy"
import { usePrivyStrategy } from "@happychain/privy-strategy"
import { AuthState, type ConnectionProvider, type HappyUser } from "@happychain/sdk-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo } from "react"
import type { EIP1193Provider } from "viem"
import { setUserWithProvider } from "../actions/setUserWithProvider"
import { setPermission } from "../services/permissions"
import { authStateAtom } from "../state/authState"
import { chainsAtom } from "../state/chains"
import { userAtom } from "../state/user"

export function useSocialProviders() {
    const setAuthState = useSetAtom(authStateAtom)
    const userValue = useAtomValue(userAtom)
    const chains = useAtomValue(chainsAtom)

    const { providers: privyProviders, onAuthChange: privyOnAuthChange } = usePrivyStrategy()
    const { providers: firebaseProviders, onAuthChange: firebaseOnAuthChange } = useFirebaseWeb3AuthStrategy()

    const providers = useMemo(
        () => new Array<ConnectionProvider>().concat(privyProviders, firebaseProviders),
        [privyProviders, firebaseProviders],
    )

    const authChangeCallback = useCallback(
        async (user: HappyUser | undefined, provider: EIP1193Provider | undefined) => {
            if (provider) {
                await Promise.allSettled(
                    Object.values(chains).map((chain) => {
                        provider.request({ method: "wallet_addEthereumChain", params: [chain] })
                    }),
                )
            }
            setUserWithProvider(user, provider)
        },
        [chains],
    )

    useEffect(() => {
        const privyUnsub = privyOnAuthChange((user: HappyUser | undefined, provider: EIP1193Provider | undefined) => {
            // not logged in and incoming user
            const loggingIn = Boolean(!userValue?.type && user)
            // logged in with privy
            const loggedIn = userValue?.type === "social" && userValue?.provider === "privy"
            if (loggingIn || loggedIn) {
                authChangeCallback(user, provider)
            }
        })

        firebaseOnAuthChange((user: HappyUser | undefined, provider: EIP1193Provider | undefined) => {
            // not logged in and incoming user
            const loggingIn = Boolean(!userValue?.type && user)
            // logged in with privy
            const loggedIn = userValue?.type === "social" && userValue?.provider === "firebase"
            if (loggingIn || loggedIn) {
                authChangeCallback(user, provider)
            }
        })

        return () => {
            privyUnsub()
        }
    }, [privyOnAuthChange, firebaseOnAuthChange, userValue, authChangeCallback])

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
