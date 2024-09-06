import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { UnauthorizedProviderError } from "viem"
import { getPermissions } from "../../services/permissions/getPermissions"
import { hasPermission } from "../../services/permissions/hasPermission"
import { authStateAtom } from "../../state/authState"

export function useWalletRequestPermissionsMiddleware() {
    const authState = useAtomValue(authStateAtom)

    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("wallet_requestPermissions" !== request.payload.method) {
                return await next()
            }

            if (authState !== AuthState.Connected) {
                throw new UnauthorizedProviderError(new Error("Not allowed"))
            }

            return hasPermission(...request.payload.params) ? getPermissions(request.payload) : []
        },
        [authState],
    )
}
