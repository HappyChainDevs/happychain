import type { Address, PrivateKeyAccount } from "viem"
import { type WriteContractParameters, writeContract } from "viem/actions"
import type { localhost } from "viem/chains"
import type { abis } from "#src/deployments"
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
    return await writeContract(client, request)
}
