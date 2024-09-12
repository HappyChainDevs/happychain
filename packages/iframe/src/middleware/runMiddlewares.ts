import type { EIP1193RequestParameters, EIP1193RequestResult } from "@happychain/sdk-shared"
import type { ProviderEventPayload } from "@happychain/sdk-shared"
import type { MiddlewareFunction } from "./types"

export function runMiddlewares(
    request: ProviderEventPayload<EIP1193RequestParameters>,
    middlewares: MiddlewareFunction[],
): Promise<EIP1193RequestResult> {
    async function executeMiddleware(
        index: number,
        _request: ProviderEventPayload<EIP1193RequestParameters>,
    ): Promise<EIP1193RequestResult> {
        if (index >= middlewares.length) {
            return _request
        }

        const middleware = middlewares[index]

        // Create a next function to call the next middleware
        const next = () => executeMiddleware(index + 1, _request)

        // Execute the current middleware
        return await middleware(_request, next)
    }

    // Start the execution chain
    return executeMiddleware(0, request)
}
