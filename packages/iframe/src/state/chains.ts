import { accessorsFromAtom } from "@happychain/common"
import { chains as _chains } from "@happychain/sdk-shared"
import { atom } from "jotai/index"
import { atomWithStorage } from "jotai/utils"
import type { AddEthereumChainParameter } from "viem"
import { StorageKey } from "../services/storage"

export const chainsAtom = atomWithStorage<(AddEthereumChainParameter | Readonly<AddEthereumChainParameter>)[]>(
    StorageKey.Chains,
    Object.values(_chains),
)

export const { getValue: getChains, setValue: setChains } = accessorsFromAtom(chainsAtom)

/**
 * Maps chains ID to chain objects.
 */
export const { getValue: getChainsMap } = accessorsFromAtom(
    atom((get) => new Map(Object.values(get(chainsAtom)).map((chain) => [chain.chainId, chain]))),
)
