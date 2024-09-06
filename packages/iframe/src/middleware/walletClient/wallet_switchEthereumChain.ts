import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { EIP1193ErrorCodes, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { chainsAtom } from "../../state/chains"

/**
 *
 * @returns
 */
export function useWalletSwitchEthereumChainMiddleware() {
    const _chains = useAtomValue(chainsAtom)

    const chains = useMemo(() => new Map(Object.values(_chains).map((chain) => [chain.chainId, chain])), [_chains])

    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if (request.payload.method !== "wallet_switchEthereumChain") {
                return await next()
            }

            // ensure chain has already been added
            if (!chains.has(request.payload.params[0].chainId)) {
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.ChainNotRecognized)
            }

            const response = await next()

            if ("URLSearchParams" in window) {
                const searchParams = new URLSearchParams(window.location.search)

                const chain = chains.get(request.payload.params[0].chainId)

                searchParams.set("chain", JSON.stringify(chain))

                history.replaceState(
                    history.state,
                    "",
                    `${location.origin}${location.pathname}?${searchParams.toString()}`,
                )
            }

            return response
        },
        [chains],
    )
}
