import { chains as _chains } from "@happychain/sdk-shared"
import { atomWithStorage } from "jotai/utils"
import type { AddEthereumChainParameter } from "viem"

export const chainsAtom = atomWithStorage<(AddEthereumChainParameter | Readonly<AddEthereumChainParameter>)[]>(
    "supported:chains",
    Object.values(_chains),
)
