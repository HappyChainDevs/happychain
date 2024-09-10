import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useCallback } from "react"
import { getPermissions } from "../../services/permissions/getPermissions"
import { setPermission } from "../../services/permissions/setPermission"

/**
 * {@link  https://eips.ethereum.org/EIPS/eip-2255}
 */
export function useWalletRequestPermissionsMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("wallet_requestPermissions" !== request.payload.method) {
                return await next()
            }

            setPermission(request.payload)

            return getPermissions(request.payload)
        },
        [],
    )
}
