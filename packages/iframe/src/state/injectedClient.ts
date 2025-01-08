import { accessorsFromAtom } from "@happychain/common"
import { type Atom, atom } from "jotai"
import { createWalletClient, custom } from "viem"
import { InjectedProviderProxy } from "#src/connections/InjectedProviderProxy.ts"
import { userAtom } from "./user"
import type { AccountWalletClient } from "./walletClient"

export const injectedClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>(
    (get) => {
        const user = get(userAtom)
        if (!user?.address) return
        const provider = new InjectedProviderProxy()
        return createWalletClient({ account: user.address, transport: custom(provider) })
    },
)

export const { getValue: getInjectedClient } = accessorsFromAtom(injectedClientAtom)
