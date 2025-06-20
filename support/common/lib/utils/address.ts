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

/**
 * Truncates an address into a shorter representation by displaying the first `digits` characters
 * and the last `digits` characters.
 */
export const shortenAddress = (address?: Address, digits = 5) => {
    if (!address) return ""
    return `${address.substring(0, digits + 2)}...${address.substring(address.length - digits)}`
}
