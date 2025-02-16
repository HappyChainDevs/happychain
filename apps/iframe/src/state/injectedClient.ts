import { accessorsFromAtom } from "@happy.tech/common"
import { type Atom, atom } from "jotai"
import { createWalletClient, custom } from "viem"
import { eip5792Actions } from "viem/experimental"
import { InjectedProviderProxy } from "#src/connections/InjectedProviderProxy.ts"
import { userAtom } from "./user"
import type { AccountWalletClient } from "./walletClient"

export const injectedClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>(
    (get) => {
        const user = get(userAtom)
        if (!user?.address) return
        const provider = InjectedProviderProxy.getInstance()
        return createWalletClient({ account: user.address, transport: custom(provider) }).extend(eip5792Actions())
    },
)

export const { getValue: getInjectedClient } = accessorsFromAtom(injectedClientAtom)
