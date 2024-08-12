import { useContext } from 'react'

import type { EIP1193ProviderProxy, HappyUser } from '@happychain/js'
import { happyProvider } from '@happychain/js'

import { HappyContext } from '../components/HappyContext'

export function useHappyChain(): {
    provider: EIP1193ProviderProxy
    user: HappyUser | null
} {
    const user = useContext(HappyContext)

    return {
        provider: happyProvider,
        user,
    }
}
