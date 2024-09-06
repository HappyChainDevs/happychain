import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useCallback } from "react"
import { getPermissions } from "../../services/permissions/getPermissions"

export function useWalletGetPermissionsMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("wallet_getPermissions" !== request.payload.method) {
                return await next()
            }

            return getPermissions(request.payload)
        },
        [],
    )
}
