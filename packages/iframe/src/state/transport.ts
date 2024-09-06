import { atom } from "jotai"
import type { CustomTransport } from "viem"
import { custom } from "viem"

import { providerAtom } from "./provider"

export const transportAtom = atom<CustomTransport | undefined>((get) => {
    const provider = get(providerAtom)
    return provider && custom(provider)
})
