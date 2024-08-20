import { useEffect, useMemo } from "react"

import { useFirebaseWeb3AuthStrategy } from "@happychain/firebase-web3auth-strategy"
import { useAtomValue, useSetAtom } from "jotai"

<<<<<<< HEAD
import { AuthState, authStateAtom } from "../state/app"

import { chainsAtom } from "../state/chains"
import { setUserWithProvider, userAtom } from "./useHappyAccount"
||||||| parent of f2638f7 (formatting & dead code elimination)
import { AuthState, authStateAtom } from '../state/app'

import { chainsAtom } from '../state/chains'
import { setUserWithProvider, userAtom } from './useHappyAccount'
=======
import { AuthState, authStateAtom } from '../state/app'
import { chainsAtom } from '../state/chains'

import { setUserWithProvider, userAtom } from './useHappyAccount'
>>>>>>> f2638f7 (formatting & dead code elimination)

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
            const loggedIn = userValue?.type === "social"
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
            providers.map((provider) => ({
                ...provider,
                enable: async () => {
                    // will automatically disable loading state when user+provider are set
                    setAuthState(AuthState.Loading)
                    await provider.enable()
                },
                disable: async () => {
                    // will automatically disable loading state when user+provider are set
                    setAuthState(AuthState.Loading)
                    await provider.disable()
                },
            })),
        [providers, setAuthState],
    )

    return providersMemo
}
