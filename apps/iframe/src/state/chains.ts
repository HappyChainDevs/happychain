import { accessorsFromAtom } from "@happy.tech/common"
import { chainDefinitions as defaultChains } from "@happy.tech/wallet-common"
import type { ChainParameters } from "@happy.tech/wallet-common"
import { type WritableAtom, atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { AddEthereumChainParameter } from "viem"
import { StorageKey } from "../services/storage"

// NOTE: If `HAPPY_RPC_OVERRIDE` is set, the RPC URL of all default chains will be set to that RPC server.

export function getChainFromSearchParams(): ChainParameters {
    const chainId = new URLSearchParams(window.location.search).get("chainId")
    const chainKey = chainId && `0x${BigInt(chainId).toString(16)}`
    const chains = getChains()
    return chainKey && chainKey in chains //
        ? chains[chainKey]
        : defaultChains.defaultChain
}

function getDefaultChainsRecord() {
    return Object.fromEntries(Object.entries(defaultChains).map(([_, chain]) => [chain.chainId, chain]))
}

/**
 * This atom maps chain IDs to their respective chain parameters. Initialized with the officially
 * supported chains.
 */
export const chainsAtom = atomWithStorage<
    Record<string, AddEthereumChainParameter> //
>(StorageKey.Chains, getDefaultChainsRecord(), undefined, { getOnInit: true })

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
