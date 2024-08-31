import { getChainFromSearchParams } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"
import type { CustomTransport, HttpTransport, PublicClient } from "viem"
import { http, createPublicClient } from "viem"
import { transportAtom } from "./transport"

const chain = getChainFromSearchParams()

const DEFAULT_HTTP_TRANSPORT = http(chain.rpcUrls[0], {
    batch: true,
})

export const publicClientAtom: Atom<PublicClient<CustomTransport | HttpTransport>> = atom((get) => {
    const transport = get(transportAtom) ?? DEFAULT_HTTP_TRANSPORT
    return createPublicClient({ transport })
})
publicClientAtom.debugLabel = "publicClientAtom"
