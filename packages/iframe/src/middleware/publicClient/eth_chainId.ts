import { getChainFromSearchParams } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useCallback } from "react"

export function useEthChainIdMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("eth_chainId" !== request.payload.method) {
                return await next()
            }

            const chainId = getChainFromSearchParams()?.chainId

            if (chainId) {
                return chainId
            }

            // will process the request normally if chainId is not set (it should be)
            return await next()
        },
        [],
    )
}
