import { defaultProvider as web3AuthEvmProvider } from '@happychain/firebase-web3auth-strategy'
import { atom } from 'jotai'
import type { EIP1193Provider } from 'viem'
import { createPublicClient, createWalletClient, custom } from 'viem'

import { userAtom } from '../hooks/useHappyAccount'

const DEFAULT_PROVIDER = web3AuthEvmProvider as EIP1193Provider

export const providerAtom = atom<EIP1193Provider>(DEFAULT_PROVIDER)
providerAtom.debugLabel = 'providerAtom'

export const publicClientAtom = atom((get) => createPublicClient({ transport: custom(get(providerAtom)) }))
publicClientAtom.debugLabel = 'publicClientAtom'

export const walletClientAtom = atom<AccountWalletClient | null>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    return user?.address ? createWalletClient({ account: user.address, transport: custom(provider) }) : null
})
walletClientAtom.debugLabel = 'walletClientAtom'

// utils
export const createAccountWalletClient = (account: `0x${string}`, provider: Parameters<typeof custom>[0]) =>
    createWalletClient({ account, transport: custom(provider) })

const make = (...params: Parameters<typeof createWalletClient> & { account: `0x${string}` }) =>
    createWalletClient(...params)

JSON.stringify({ make })

export type AccountWalletClient = ReturnType<typeof createAccountWalletClient>
