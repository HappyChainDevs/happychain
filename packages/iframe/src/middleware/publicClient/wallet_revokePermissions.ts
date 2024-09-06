import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { UnauthorizedProviderError } from "viem"
import { getPermissions } from "../../services/permissions/getPermissions"
import { revokePermission } from "../../services/permissions/revokePermission"
import { authStateAtom } from "../../state/authState"

export function useWalletRevokePermissionsMiddleware() {
    const authState = useAtomValue(authStateAtom)

    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            console.log(request.payload)
            if ("wallet_revokePermissions" !== request.payload.method) {
                return await next()
            }

            if (authState !== AuthState.Connected) {
                throw new UnauthorizedProviderError(new Error("Not allowed"))
            }

            revokePermission(...request.payload.params)

            return getPermissions(request.payload)
        },
        [authState],
    )
}
