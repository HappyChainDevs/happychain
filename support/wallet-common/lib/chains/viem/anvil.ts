import { anvilDefinition } from "../definitions/anvil"
import { convertToViemChain } from "../utils"
import type { Chain } from "./type"

/**
 * Localhost Anvil chain for local development.
 *
 * Type: {@link Chain}
 */
export const anvil: Chain = convertToViemChain(anvilDefinition)
