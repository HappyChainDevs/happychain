import { accessorsFromAtom } from "@happychain/common"
import { type Atom, atom } from "jotai"
import type { CustomTransport, ParseAccount, WalletClient } from "viem"
import { createWalletClient, custom } from "viem"
import { InjectedProviderProxy } from "#src/connections/InjectedProviderProxy.ts"
import { userAtom } from "./user"

// utils
export type AccountInjectedClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>

export const injectedClientAtom: Atom<AccountInjectedClient | undefined> = atom<AccountInjectedClient | undefined>(
    (get) => {
        const user = get(userAtom)
        if (!user?.address) return
        return createWalletClient({
            account: user.address,
            transport: custom(new InjectedProviderProxy()),
        })
    },
)

export const { getValue: getInjectedClient } = accessorsFromAtom(injectedClientAtom)
