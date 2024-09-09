import type { Address } from "viem"

/**
 * Truncates an address into a shorter representation by displaying the first `digits` characters
 * and the last `digits` characters.
 */
export const shortenAddress = (address?: Address, digits = 5) => {
    if (!address) return ""
    return `${address.substring(0, digits + 2)}...${address.substring(address.length - digits)}`
}
