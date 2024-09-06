import type { EIP1193RequestParameters, EIP1193RequestResult } from "@happychain/sdk-shared"
import type { ProviderEventPayload } from "@happychain/sdk-shared"
import { useCallback } from "react"
import type { Client } from "viem"
import type { MiddlewareExecutor, MiddlewareType } from "./types"

export function runMiddlewares(
    executeRequest: () => Promise<EIP1193RequestResult>,
    _request: ProviderEventPayload<EIP1193RequestParameters>,
    middlewares: MiddlewareType[],
): Promise<EIP1193RequestResult> {
    async function executeMiddleware(
        index: number,
        request: ProviderEventPayload<EIP1193RequestParameters>,
    ): Promise<EIP1193RequestResult> {
        if (index >= middlewares.length) {
            return await executeRequest()
        }

        const middleware = middlewares[index]

        // Create a next function to call the next middleware
        const next = () => executeMiddleware(index + 1, request)

        // Execute the current middleware
        return await middleware(request, next)
    }

    // Start the execution chain
    return executeMiddleware(0, _request)
}

export function useClientMiddlewareExecutor<T extends Client | undefined, P extends EIP1193RequestParameters>(
    execute: MiddlewareExecutor<T, P>,
    middlewares: MiddlewareType[],
) {
    return useCallback(
        async (client: T, data: ProviderEventPayload<P>) => {
            return await runMiddlewares(() => execute(client, data), data, middlewares)
        },
        [middlewares, execute],
    )
}
