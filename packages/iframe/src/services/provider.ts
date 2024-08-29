import { getChainFromSearchParams } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import type { CustomTransport, EIP1193Provider, HttpTransport, ParseAccount, PublicClient, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient, custom } from "viem"
import { userAtom } from "../state/user"

const chain = getChainFromSearchParams()

export const providerAtom = atom<EIP1193Provider | undefined>()
providerAtom.debugLabel = "providerAtom"

const fallbackHttpTransport = http(chain.rpcUrls[0], {
    batch: true,
})

export const transportAtom = atom<CustomTransport | undefined>((get) => {
    const provider = get(providerAtom)
    return provider && custom(provider)
})
transportAtom.debugLabel = "transportAtom"

export const publicClientAtom: Atom<PublicClient<CustomTransport | HttpTransport>> = atom((get) => {
    const transport = get(transportAtom) ?? fallbackHttpTransport
    return createPublicClient({ transport })
})
publicClientAtom.debugLabel = "publicClientAtom"

export const walletClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    const transport = get(transportAtom)
    if (!user?.address || !provider || !transport) {
        return
    }

    return createWalletClient({ account: user.address, transport })
})
walletClientAtom.debugLabel = "walletClientAtom"

// utils
export type AccountWalletClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>
