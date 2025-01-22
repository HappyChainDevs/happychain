import type { Chain } from "viem"
import { devnet as addChainDefinition } from "../definitions/devnet"
import { convertToViemChain } from "../utils"

/**
 * Localhost Anvil chain for local development.
 */
export const devnet: Chain = convertToViemChain(addChainDefinition)
