import { writeContract } from "viem/actions"
import type { BasicClient } from "../types"
import type { simulateSubmit } from "./simulateSubmit"

export async function submit(
    client: BasicClient,
    // TODO: default to our entrypoint (defined in contracts)
    // request: Parameters<typeof writeContract>[1] & { address: Address; args: [`0x${string}`] },
    // request: WriteContractParameters<typeof happyAAAbis.HappyEntryPoint, "submit", [`0x${string}`]>,
    // TODO: this shouldn't be like this
    request: Awaited<ReturnType<typeof simulateSubmit>>["request"],
) {
    return await writeContract(client, request)
}
