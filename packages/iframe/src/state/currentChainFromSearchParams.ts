import { accessorsFromAtom } from "@happychain/common"
import { type ChainParameters, getChainFromSearchParams } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"

export const currentChainAtom: Atom<ChainParameters> = atom(() => {
    return getChainFromSearchParams()
})

export const { getValue: getCurrentChain } = accessorsFromAtom(currentChainAtom)
