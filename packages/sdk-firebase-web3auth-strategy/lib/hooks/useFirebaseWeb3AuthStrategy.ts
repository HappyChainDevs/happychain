import { useMemo } from 'react'

import type { ConnectionProvider, HappyUser } from '@happychain/core'
import type { EIP1193Provider } from 'viem'

import { googleLogo } from '../logos'
import { firebaseAuth } from '../services/firebase'
import { web3AuthEvmProvider } from '../services/web3auth'

import { useFirebaseAuth } from './useFirebaseAuth'

export function useFirebaseWeb3AuthStrategy(): {
    providers: ConnectionProvider[]
    onAuthChange: (callback: (user: HappyUser | null, provider: EIP1193Provider) => void) => void
} {
    const { signIn, signOut, onAuthChange } = useFirebaseAuth(firebaseAuth)

    const providers = useMemo(
        () => [
            {
                type: 'social',
                id: 'social:firebase',
                name: 'Google',
                icon: googleLogo,
                enable: () => signIn('google'),
                disable: () => signOut(),
                getProvider: () => web3AuthEvmProvider,
            },
        ],
        [signIn, signOut],
    )

    return {
        providers: providers,
        onAuthChange,
    }
}
