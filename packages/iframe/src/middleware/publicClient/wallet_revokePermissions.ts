import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore, useAtomValue } from "jotai"
import { useCallback } from "react"
import { UnauthorizedProviderError } from "viem"
import { getPermissions } from "../../services/permissions/getPermissions"
import { revokePermission } from "../../services/permissions/revokePermission"
import { authStateAtom } from "../../state/authState"

const store = getDefaultStore()

/**
 * {@link https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md}
 */
export function useWalletRevokePermissionsMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("wallet_revokePermissions" !== request.payload.method) {
                return await next()
            }

            if (store.get(authStateAtom) !== AuthState.Connected) {
                throw new UnauthorizedProviderError(new Error("Not allowed"))
            }

            revokePermission(...request.payload.params)

            return getPermissions(request.payload)
        },
        [],
    )
}
