import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { UnauthorizedProviderError } from "viem"
import { hasPermission } from "../../services/permissions/hasPermission"
import { authStateAtom } from "../../state/authState"
import { userAtom } from "../../state/user"

export function useEthRequestAccountsMiddleware() {
    const authState = useAtomValue(authStateAtom)
    const user = useAtomValue(userAtom)

    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("eth_requestAccounts" !== request.payload.method) {
                return await next()
            }

            if (authState !== AuthState.Connected) {
                throw new UnauthorizedProviderError(new Error("Not allowed"))
            }

            return hasPermission({ eth_accounts: {} }) ? user?.addresses : []
        },
        [authState, user],
    )
}
