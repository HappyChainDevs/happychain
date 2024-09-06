import { type Atom, atom } from "jotai"
import type { CustomTransport, ParseAccount, WalletClient } from "viem"
import { createWalletClient } from "viem"
import { userAtom } from "../state/user"
import { providerAtom } from "./provider"
import { transportAtom } from "./transport"

// utils
export type AccountWalletClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>

export const walletClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    const transport = get(transportAtom)
    if (!user?.address || !provider || !transport) {
        return
    }

    return createWalletClient({ account: user.address, transport })
})
