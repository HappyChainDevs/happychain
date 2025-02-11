import { writeContract } from "viem/actions"
import { parseFromViemError } from "#src/errors/utils"
import type { BasicClient } from "../types"
import type { simulateSubmit } from "./simulateSubmit"

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
    request: Awaited<ReturnType<typeof simulateSubmit>>["request"],
) {
    try {
        return await writeContract(client, request)
    } catch (_err) {
        throw parseFromViemError(_err) || _err
    }
}
