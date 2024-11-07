import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import type { CustomTransport, ParseAccount, WalletClient } from "viem"
import { createWalletClient } from "viem"
import { currentChainAtom } from "./chains"
import { providerAtom } from "./provider"
import { transportAtom } from "./transport"
import { userAtom } from "./user"

// utils
export type AccountWalletClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>

export const walletClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    const transport = get(transportAtom)
    const currentChain = get(currentChainAtom)
    if (!user?.address || !provider || !transport) {
        return
    }

    return createWalletClient({
        account: user.address,
        chain: convertToViemChain(currentChain),
        transport,
    })
})

export const { getValue: getWalletClient } = accessorsFromAtom(walletClientAtom)
