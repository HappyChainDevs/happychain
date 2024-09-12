import { accessorsFromAtom } from "@happychain/common/lib/utils/jotai"
import { convertToViemChain, getChainFromSearchParams } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import type { CustomTransport, HttpTransport, PublicClient } from "viem"
import { http, createPublicClient } from "viem"
import { publicActionsL2 } from "viem/op-stack"
import { transportAtom } from "./transport"

export const publicClientAtom: Atom<PublicClient<CustomTransport | HttpTransport>> = atom((get) => {
    const chain = getChainFromSearchParams()
    const transport = get(transportAtom) ?? http(chain.rpcUrls[0], { batch: true })

    const publicClient = createPublicClient({ transport, chain: convertToViemChain(chain) })

    // https://github.com/wevm/viem/blob/main/src/clients/createPublicClient.ts#L89
    // biome-ignore lint/suspicious/noExplicitAny: viem uses any as well
    return (chain.opStack ? publicClient : publicClient.extend(publicActionsL2())) as any
})

export const { getValue: getPublicClient } = accessorsFromAtom(publicClientAtom)
