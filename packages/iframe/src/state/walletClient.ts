import { accessorsFromAtom } from "@happychain/common"
import { type Atom, atom } from "jotai"
import type { CustomTransport, ParseAccount, WalletClient } from "viem"
import { createWalletClient } from "viem"
import { providerAtom } from "./provider"
import { transportAtom } from "./transport"
import { userAtom } from "./user"

export type AccountWalletClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>

export const walletClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    const transport = get(transportAtom)
    if (!user?.address || !provider || !transport) return

    return createWalletClient({ account: user.address, transport })
})

export const { getValue: getWalletClient } = accessorsFromAtom(walletClientAtom)