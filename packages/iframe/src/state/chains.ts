import { chains as _chains } from "@happychain/sdk-shared"
import { atomWithStorage } from "jotai/utils"
import type { AddEthereumChainParameter } from "viem"
import { StorageKey } from "../services/storage"

export const chainsAtom = atomWithStorage<(AddEthereumChainParameter | Readonly<AddEthereumChainParameter>)[]>(
    StorageKey.Chains,
    Object.values(_chains),
)
