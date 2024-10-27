import { accessorsFromAtom } from "@happychain/common"
import { type ChainParameters, getChainFromSearchParams } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"

/**
 * Atom to wrap around the {@link getChainFromSearchParams} function, to
 * initialize the current chain details on page load for iframe wide access.
 */
export const baseChainAtom: Atom<{ getChain: () => ChainParameters }> = atom({
    getChain: () => getChainFromSearchParams(),
})

export const currentChainAtom = atom((get) => get(baseChainAtom).getChain())

export const { getValue: getCurrentChain } = accessorsFromAtom(currentChainAtom)
