import type { Prettify, SimulateContractParameters } from "viem"
import { simulateContract } from "viem/actions"
import { account } from "#src/clients"
import { abis } from "#src/deployments"
import { parseFromViemError } from "#src/errors/utils"
import type { BasicClient } from "../types"

export async function simulateSubmit(
    client: BasicClient,
    params: Prettify<
        Pick<SimulateContractParameters<typeof abis.HappyEntryPoint, "submit", [`0x${string}`]>, "address" | "args">
    >,
) {
    try {
        return await simulateContract(client, {
            ...params,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        })
    } catch (_err) {
        throw parseFromViemError(_err) || _err
    }
}
