import { atom } from "jotai"
import type { CustomTransport, EIP1193Provider, HttpTransport, ParseAccount, WalletClient } from "viem"
import { createPublicClient, createWalletClient, custom, http } from "viem"

import { userAtom } from "../hooks/useHappyAccount"

export const providerAtom = atom<EIP1193Provider | undefined>()
providerAtom.debugLabel = "providerAtom"

export const transportAtom = atom<HttpTransport | CustomTransport>((get) => {
    const provider = get(providerAtom)
    return provider ? custom(provider) : http(import.meta.env.VITE_WEB3AUTH_CHAIN_RPC)
})
transportAtom.debugLabel = "transportAtom"

export const publicClientAtom = atom((get) => {
    const transport = get(transportAtom)
    return createPublicClient({ transport })
})
publicClientAtom.debugLabel = "publicClientAtom"

export const walletClientAtom = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    if (!user?.address || !provider) {
        return
    }

    const transport = get(transportAtom) as CustomTransport

    return createWalletClient({ account: user.address, transport }) as AccountWalletClient
})
walletClientAtom.debugLabel = "walletClientAtom"

// utils
export type AccountWalletClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>
