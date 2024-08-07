import type { HappyUser } from '@happychain/core'
import { getDefaultStore, useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { EIP1193Provider } from 'viem'

import { providerAtom } from '../services/provider'
import { AuthState, authStateAtom } from '../state/app'

export const userAtom = atomWithStorage<null | HappyUser>('happychain:cached-user', null)
userAtom.debugLabel = 'userAtom'

const store = getDefaultStore()

export function setUserWithProvider(user: HappyUser | null, provider: EIP1193Provider) {
    store.set(providerAtom, () => provider)
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
