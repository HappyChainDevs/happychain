import type { Prettify } from "viem"
import { type SimulateContractParameters, writeContract } from "viem/actions"
import { account } from "#src/clients"
import { abis } from "#src/deployments"
import { parseFromViemError } from "#src/errors/utils"
import type { BasicClient } from "../types"

export async function submit(
    client: BasicClient,
    // request: Parameters<typeof writeContract>[1] & { address: Address; args: [`0x${string}`] },
    // request: WriteContractParameters<
    //     typeof abis.HappyEntryPoint,
    //     "submit",
    //     [`0x${string}`],
    //     typeof localhost,
    //     PrivateKeyAccount
    // >,
    // TODO: this shouldn't rely on the returnType of simulateSubmit
    // This should be able to run in isolation if desired
    // request: Awaited<ReturnType<typeof simulateSubmit>>["request"],
    request: Prettify<
        Pick<SimulateContractParameters<typeof abis.HappyEntryPoint, "submit", [`0x${string}`]>, "address" | "args">
    >,
) {
    try {
        return await writeContract(client, {
            ...request,
            abi: abis.HappyEntryPoint,
            functionName: "submit",
            account,
        })
    } catch (_err) {
        throw parseFromViemError(_err) || _err
    }
}
