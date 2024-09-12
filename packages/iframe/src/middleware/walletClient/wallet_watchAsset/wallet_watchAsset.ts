import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { addWatchedAsset } from "../../../services/watchedAssets/utils"
import { getUser } from "../../../state/user"

/**
 * Handles the {@link https://github.com/ethereum/EIPs/blob/master/EIPS/eip-747.md | EIP-747}
 * `wallet_watchAsset` request which instructs the wallet to track a token.
 */
export async function walletWatchAssetMiddleware(
    request: ProviderEventPayload<EIP1193RequestParameters>,
    next: () => Promise<EIP1193RequestResult>,
): Promise<EIP1193RequestResult> {
    if (request.payload.method !== "wallet_watchAsset") {
        return await next()
    }
    const happyUser = getUser()

    return happyUser ? addWatchedAsset(happyUser.address, request.payload.params) : false
}
