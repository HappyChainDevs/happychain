import type { PrivateKeyAccount, SimulateContractParameters, SimulateContractReturnType } from "viem"
import { simulateContract } from "viem/actions"
import type { localhost } from "viem/chains"
import { account } from "#src/clients"
import { abis } from "#src/deployments"
import type { BasicClient } from "../types"

export async function simulateSubmit(
    client: BasicClient,
    params: Pick<
        SimulateContractParameters<typeof abis.HappyEntryPoint, "submit", [`0x${string}`]>,
        "address" | "args"
    >,
) {
    return await simulateContract(client, {
        ...params,
        abi: abis.HappyEntryPoint,
        functionName: "submit",
        account,
    })
}
