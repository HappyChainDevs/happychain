import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { useCallback } from "react"
import { UnauthorizedProviderError } from "viem"
import { hasPermission } from "../../../services/permissions/hasPermission"
import { authStateAtom } from "../../../state/authState"
import { userAtom } from "../../../state/user"

const store = getDefaultStore()

/**
 * {@link  https://eips.ethereum.org/EIPS/eip-1102}
 */
export function useEthRequestAccountsMiddleware() {
    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("eth_requestAccounts" !== request.payload.method) {
                return await next()
            }

            if (store.get(authStateAtom) !== AuthState.Connected) {
                throw new UnauthorizedProviderError(new Error("Not allowed"))
            }

            return hasPermission({ eth_accounts: {} }) ? store.get(userAtom)?.addresses : []
        },
        [],
    )
}
