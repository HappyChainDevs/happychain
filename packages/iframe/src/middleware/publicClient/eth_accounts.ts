import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { useCallback } from "react"
import { hasPermission } from "../../services/permissions/hasPermission"
import { userAtom } from "../../state/user"

export function useEthAccountsMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("eth_accounts" !== request.payload.method) {
                return await next()
            }

            return hasPermission({ eth_accounts: {} }) ? getDefaultStore().get(userAtom)?.addresses : []
        },
        [],
    )
}
