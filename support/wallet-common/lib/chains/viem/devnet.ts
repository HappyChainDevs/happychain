import { devnetDefinition as addChainDefinition } from "../definitions/devnet"
import { convertToViemChain } from "../utils"
import type { Chain } from "./type"

/**
 * Localhost Anvil chain for local development.
 *
 * Type: {@link Chain}
 */
export const devnet: Chain = convertToViemChain(addChainDefinition)
