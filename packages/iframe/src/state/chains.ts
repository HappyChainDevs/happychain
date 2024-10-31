import { accessorsFromAtom } from "@happychain/common"
import { chains as _chains } from "@happychain/sdk-shared"
import { atomWithStorage } from "jotai/utils"
import type { AddEthereumChainParameter } from "viem"
import { StorageKey } from "../services/storage"

export type ChainRecord = Record<string, AddEthereumChainParameter>

export const chainsAtom = atomWithStorage<ChainRecord>(StorageKey.Chains, _chains)

export const { getValue: getChains, setValue: setChains } = accessorsFromAtom(chainsAtom)
