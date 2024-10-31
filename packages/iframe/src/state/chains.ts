import { accessorsFromAtom } from "@happychain/common"
import { chains as defaultChains } from "@happychain/sdk-shared"
import { type ChainParameters, getChainFromSearchParams } from "@happychain/sdk-shared"
import { type WritableAtom, atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { AddEthereumChainParameter } from "viem"
import { StorageKey } from "../services/storage"

/**
 * This atom maps chain IDs to their respective chain parameters. Initialized with the officially
 * supported chains.
 */
export const chainsAtom = atomWithStorage<
    Record<string, AddEthereumChainParameter> //
>(StorageKey.Chains, defaultChains)

export const {
    /** See {@link chainsAtom} */
    getValue: getChains,
    /** See {@link chainsAtom} */
    setValue: setChains,
} = accessorsFromAtom(chainsAtom)

/**
 * This atom stores the current configuration of the chain that the iframe is connected to.
 *
 * This is initialized with the chain whose ID is passed in the URL, if present and if the chain
 * is known to the wallet (default chain or previously added). Otherwise, we use the default chain.
 *
 * Setting this atom correctly updates the chain ID in the URL.
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

export const {
    /** See {@link currentChainAtom} */
    getValue: getCurrentChain,
    /** See {@link currentChainAtom} */
    setValue: setCurrentChain,
} = accessorsFromAtom(currentChainAtom)
