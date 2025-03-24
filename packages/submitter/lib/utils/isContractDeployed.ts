import { publicClient } from "#lib/clients"
import type { Address } from "#lib/tmp/interface/common_chain"

export async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
