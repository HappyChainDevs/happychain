import { atom } from 'jotai'
import type { CustomTransport, EIP1193Provider, HttpTransport } from 'viem'
import { createPublicClient, createWalletClient, custom, http } from 'viem'

import { userAtom } from '../hooks/useHappyAccount'

export const providerAtom = atom<EIP1193Provider | null>(null)
providerAtom.debugLabel = 'providerAtom'

export const transportAtom = atom<HttpTransport | CustomTransport>((get) => {
    const provider = get(providerAtom)
    return provider ? custom(provider) : http('https://eth.llamarpc.com')
})
transportAtom.debugLabel = 'transportAtom'

export const publicClientAtom = atom((get) => {
    const transport = get(transportAtom)
    return createPublicClient({ transport })
})
publicClientAtom.debugLabel = 'publicClientAtom'

export const walletClientAtom = atom<AccountWalletClient | null>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    if (!user?.address || !provider) {
        return null
    }

    const transport = get(transportAtom) as CustomTransport

    return createWalletClient({ account: user.address, transport })
})
walletClientAtom.debugLabel = 'walletClientAtom'

// utils
export const createAccountWalletClient = (account: `0x${string}`, provider: Parameters<typeof custom>[0]) =>
    createWalletClient({ account, transport: custom(provider) })

export type AccountWalletClient = ReturnType<typeof createAccountWalletClient>
