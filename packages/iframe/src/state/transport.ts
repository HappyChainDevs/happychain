import { atom } from "jotai"
import type { CustomTransport } from "viem"
import { custom } from "viem"
import { accessorsFromAtom } from "@happychain/common"

import { providerAtom } from "./provider"

export const transportAtom = atom<CustomTransport | undefined>((get) => {
    const provider = get(providerAtom)
    console.log("transportAtom called with provider", provider)
    return provider ? custom(provider) : undefined
})

export const { getValue: getTransport } = accessorsFromAtom(transportAtom)