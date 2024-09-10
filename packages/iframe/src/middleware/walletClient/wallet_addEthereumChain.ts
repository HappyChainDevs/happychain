import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useSetAtom } from "jotai"
import { useCallback } from "react"
import { chainsAtom } from "../../state/chains"
import { isAddChainParams } from "../../utils/isAddChainParam"

/**
 * {@link https://eips.ethereum.org/EIPS/eip-3085}
 */
export function useWalletAddEthereumChainMiddleware() {
    const setChains = useSetAtom(chainsAtom)

    return useCallback(
        async (request: ProviderEventPayload<EIP1193RequestParameters>, next: () => Promise<EIP1193RequestResult>) => {
            if (request.payload.method !== "wallet_addEthereumChain") {
                return await next()
            }

            const resp = await next()

            // only add chain after previous is successful
            const params: unknown =
                typeof request.payload.params === "object" &&
                Array.isArray(request.payload.params) &&
                request.payload.params?.[0]

            if (params && isAddChainParams(params)) {
                setChains((previous) => [...previous, params])
            }

            return resp
        },
        [setChains],
    )
}
