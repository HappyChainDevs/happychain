import type {
    EIP1193RequestParameters,
    EIP1193RequestResult,
    ProviderEventPayload,
} from "@happychain/sdk-shared/lib/interfaces/eip1193Provider"
import { useCallback, useMemo, useState } from "react"
import { setNewWatchedAsset } from "../../../services/watchedAssets/utils"

/**
 * {@link https://github.com/ethereum/EIPs/blob/master/EIPS/eip-747.md}
 */
export function useWalletWatchAssetMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if (request.payload.method !== "wallet_watchAsset") {
                return await next()
            }

            const assetAdded = setNewWatchedAsset(request.payload.params)
            return assetAdded
        },
        [],
    )
}
