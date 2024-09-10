import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback, useMemo, useState } from "react"
import { addWatchedAsset } from "../../../services/watchedAssets/utils"
import { userAtom } from "../../../state/user"

/**
 * Handles the {@link https://github.com/ethereum/EIPs/blob/master/EIPS/eip-747.md | EIP-747}
 * `wallet_watchAsset` request which instructs the wallet to track a token.
 */
export function useWalletWatchAssetMiddleware() {
    const happyUser = useAtomValue(userAtom)

    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if (request.payload.method !== "wallet_watchAsset") {
                return await next()
            }

            return happyUser ? addWatchedAsset(happyUser.address, request.payload.params) : false
        },
        [happyUser],
    )
}
