import { isAddress as viemIsAddress } from "viem"
import type { Address } from "./types"

/**
 * Often used in conjunction with transforms/toAddress, this viem wrapper
 * makes for a simple zod refinement. The option { strict: false } ensures
 * this uses the same position in the internal LRU cache that viem implements
 * for address validation with getAddress.
 */
export function isAddress(str: string): str is Address {
    return viemIsAddress(str, { strict: false })
}
