import { accessorsFromAtom } from "@happychain/common"
import { type ChainParameters, getChainFromSearchParams } from "@happychain/sdk-shared"
import { type WritableAtom, atom } from "jotai"
import type { AddEthereumChainParameter } from "viem"

/**
 * This atom stores the current configuration of the chain that
 * the iframe is connected to.
 *
 * The atom is initialised (and updated) with the ChainParameters
 * object obtained from the current URL state.
 *
 * When `setCurrentChain` is called with a new chain payload, this atom:
 *   - Updates the chain in the application state.
 *   - Modifies the `chain` query parameter in the URL without reloading the page.
 */
export const currentChainAtom: WritableAtom<
    ChainParameters,
    [AddEthereumChainParameter | Readonly<AddEthereumChainParameter> | undefined],
    void
> = atom(getChainFromSearchParams(), (_get, set, newChain) => {
    set(currentChainAtom, newChain)
    if (!newChain || !("URLSearchParams" in window)) return
    // Update the URL with the new chain ID
    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set("chainId", newChain.chainId)
    history.replaceState(history.state, "", `${location.origin}${location.pathname}?${searchParams.toString()}`)
})

export const { getValue: getCurrentChain, setValue: setCurrentChain } = accessorsFromAtom(currentChainAtom)
