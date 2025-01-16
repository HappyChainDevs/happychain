import type { Address } from "viem"
import { publicClient } from "./clients"

/** Checks if there is deployed code at the specified address
 * @param client Viem public client instance
 * @param address Address to check
 * @returns True if code exists at address, false otherwise
 */
export async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
