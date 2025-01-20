import { accessorsFromAtom } from "@happychain/common"
import { type Atom, atom } from "jotai"
import type { CustomTransport, ParseAccount, WalletClient } from "viem"
import { createWalletClient, type WalletRpcSchema, type PublicRpcSchema } from "viem"
import { providerAtom } from "./provider"
import { transportAtom } from "./transport"
import { userAtom } from "./user"

export type AccountWalletClient = WalletClient<
    CustomTransport,
    undefined,
    ParseAccount<`0x${string}`>,
    [...WalletRpcSchema, ...PublicRpcSchema]
>

export const walletClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const provider = get(providerAtom)
    const transport = get(transportAtom)
    if (!user?.controllingAddress || !provider || !transport) return

    return createWalletClient({ account: user.controllingAddress, transport })
})

export const { getValue: getWalletClient } = accessorsFromAtom(walletClientAtom)
