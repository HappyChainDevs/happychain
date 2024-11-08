import { accessorsFromAtom } from "@happychain/common"
import { convertToViemChain } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import type { CustomTransport, ParseAccount, WalletClient } from "viem"
import { createWalletClient, custom } from "viem"
import { iframeProvider } from "#src/wagmi/provider.ts"
import { currentChainAtom } from "./chains"
import { userAtom } from "./user"

// utils
export type AccountWalletClient = WalletClient<CustomTransport, undefined, ParseAccount<`0x${string}`>>

export const walletClientAtom: Atom<AccountWalletClient | undefined> = atom<AccountWalletClient | undefined>((get) => {
    const user = get(userAtom)
    const chain = get(currentChainAtom)
    if (!user?.address) {
        return
    }
    return createWalletClient({
        account: user.address,
        // ship all requests through the iframe provider (wagmi/provider.ts)
        // (= requests will go through a middleware before passing them to web3auth )
        transport: custom(iframeProvider), 
        chain: {
            ...convertToViemChain(chain),
            contracts: {
                ensRegistry: { address: undefined },
                ensUniversalResolver: { address: undefined },
            }
        }
    })
})

export const { getValue: getWalletClient } = accessorsFromAtom(walletClientAtom)
