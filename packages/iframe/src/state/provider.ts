import { atom } from "jotai"
import type { EIP1193Provider } from "viem"

export const providerAtom = atom<EIP1193Provider | undefined>()
providerAtom.debugLabel = "providerAtom"
