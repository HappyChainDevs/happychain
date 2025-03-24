import { publicClient } from "#src/clients"
import type { Address } from "#src/tmp/interface/common_chain"

export async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
