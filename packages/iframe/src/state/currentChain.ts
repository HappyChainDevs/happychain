import { accessorsFromAtom } from "@happychain/common"
import { type ChainParameters, getChainFromSearchParams } from "@happychain/sdk-shared"
import { type Atom, atom } from "jotai"

/**
 * Atom to wrap around the `getChainFromSearchParams` function, to
 * initialize the current chain details on page load for app wide access.
 */
export const currentChainAtom: Atom<ChainParameters> = atom(() => {
    return getChainFromSearchParams()
})

export const { getValue: getCurrentChain } = accessorsFromAtom(currentChainAtom)

// === State Accessors ========================================================================

/**
 * Returns the Block Explorer URL, if present.
 */
export function getCurrentChainBlockExplorerUrl(): string {
    const currentChain = getCurrentChain()
    return currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
}
