import { convertToViemChain, getChainFromSearchParams } from "@happychain/sdk-shared"
import { happyChainSepolia } from "@happychain/sdk-shared/lib/chains"
import { type Atom, atom } from "jotai"
import type { CustomTransport, HttpTransport, PublicClient } from "viem"
import { http, createPublicClient } from "viem"
import { publicActionsL2 } from "viem/op-stack"
import { transportAtom } from "./transport"

export const publicClientAtom: Atom<PublicClient<CustomTransport | HttpTransport>> = atom((get) => {
    const chain = getChainFromSearchParams()
    const transport = get(transportAtom) ?? http(chain.rpcUrls[0], { batch: true })
    if (chain.chainId === happyChainSepolia.chainId) {
        return createPublicClient({ transport, chain: convertToViemChain(chain) }).extend(publicActionsL2())
    }

    return createPublicClient({ transport, chain: convertToViemChain(chain) })
})
publicClientAtom.debugLabel = "publicClientAtom"
