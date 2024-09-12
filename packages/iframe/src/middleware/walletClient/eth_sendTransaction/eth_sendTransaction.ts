import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback, useMemo, useState } from "react"
import { addWatchedAsset } from "../../../services/watchedAssets/utils"
import { userAtom } from "../../../state/user"

/**
 * {@link https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendtransaction}
 */
export function useEthSendTransactionMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if (request.payload.method !== "eth_sendTransaction") {
                return await next()
            }

            // add tx to recorded history

            return true
        },
        [],
    )
}
