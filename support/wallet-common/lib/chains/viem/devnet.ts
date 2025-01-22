import { devnet as addChainDefinition } from "../definitions/devnet"
import { convertToViemChain } from "../utils"
import type { Chain } from "./type"

/**
 * Localhost Anvil chain for local development.
 */
export const devnet: Chain = convertToViemChain(addChainDefinition)
