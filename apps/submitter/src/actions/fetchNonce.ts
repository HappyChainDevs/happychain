import { publicClient } from "#src/clients"
import { abis } from "#src/deployments"
import type { Bufferable } from "#src/nonceQueueManager"

/**
 * Default onchain nonce fetching strategy.
 * Looks up nonce via nonceTrack on ScrappyAccount
 */
export async function fetchNonce(intent: Bufferable) {
    return await publicClient.readContract({
        address: intent.account,
        abi: abis.ScrappyAccount,
        functionName: "getNonce",
        args: [intent.nonceTrack],
    })
}
