import { ethereum } from "@happychain/sdk-shared/lib/chains"
import { chains as _chains } from "../lib/index"

export const defaultChain = _chains.defaultChain

export const chains = Array.from(new Map(Object.values(_chains).map((a) => [a.chainId, a])).values()).concat(ethereum)
