import type { Address } from "@happy.tech/common"
import { publicClient } from "#lib/clients"

export async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
