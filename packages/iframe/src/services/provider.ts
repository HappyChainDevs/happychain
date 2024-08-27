import { getChainFromSearchParams } from "@happychain/sdk-shared"
import { atom } from "jotai"
import type { CustomTransport, EIP1193Provider, HttpTransport, ParseAccount, PublicClient, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient, custom } from "viem"

import { userAtom } from "../hooks/useHappyAccount"

const chain = getChainFromSearchParams()

export const providerAtom = atom<EIP1193Provider | undefined>()
providerAtom.debugLabel = "providerAtom"

const DEFAULT_HTTP_TRANSPORT = http(chain.rpcUrls[0], {
    batch: true,
})

export const transportAtom = atom<CustomTransport | undefined>((get) => {
    const provider = get(providerAtom)
    return provider && custom(provider)
})
transportAtom.debugLabel = "transportAtom"

export const publicClientAtom = atom((get) => {
    const transport = get(transportAtom) ?? DEFAULT_HTTP_TRANSPORT
    return createPublicClient({ transport }) satisfies PublicClient<CustomTransport | HttpTransport>
})
publicClientAtom.debugLabel = "publicClientAtom"

export const walletClientAtom = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    const transport = get(transportAtom)
    if (!user?.address || !provider || !transport) {
        return
    }

    return createWalletClient({ account: user.address, transport }) satisfies AccountWalletClient
})
walletClientAtom.debugLabel = "walletClientAtom"

// utils
export type AccountWalletClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>
