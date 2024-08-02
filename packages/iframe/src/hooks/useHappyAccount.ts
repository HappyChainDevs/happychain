import type { HappyUser } from '@happychain/core'
import { getDefaultStore, useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { createPublicClient, createWalletClient, custom, type EIP1193Provider } from 'viem'

import { providerAtom, publicClientAtom, walletClientAtom } from '../services/provider'
import { AuthState, authStateAtom } from '../state/app'

export const userAtom = atomWithStorage<null | HappyUser>('happychain:cached-user', null)
userAtom.debugLabel = 'userAtom'

const store = getDefaultStore()

export function setUserWithProvider(user: HappyUser | null, provider: EIP1193Provider) {
    // set user values (or null)
    // set provider
    // createPublicClient
    // createWalletClient or set to null if no user
    const publicClient = createPublicClient({ transport: custom(provider) })
    const walletClient = user ? createWalletClient({ account: user.address, transport: custom(provider) }) : null

    store.set(providerAtom, () => provider)
    store.set(publicClientAtom, () => publicClient)
    store.set(walletClientAtom, () => walletClient)
    store.set(userAtom, () => user)

    // user auth state
    store.set(authStateAtom, () => (user ? AuthState.Authenticated : AuthState.Unauthenticated))
}

export function useHappyAccount() {
    const user = useAtomValue(userAtom)

    return {
        user,
    }
}
