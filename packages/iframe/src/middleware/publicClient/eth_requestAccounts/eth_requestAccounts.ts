import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { UnauthorizedProviderError } from "viem"
import { hasPermission } from "../../../services/permissions"
import { getAuthState } from "../../../state/authState"
import { getUser } from "../../../state/user"

/**
 * {@link  https://eips.ethereum.org/EIPS/eip-1102}
 */
export async function ethRequestAccountsMiddleware(
    request: ProviderEventPayload<EIP1193RequestParameters>,
    next: () => Promise<EIP1193RequestResult>,
): Promise<EIP1193RequestResult> {
    if ("eth_requestAccounts" !== request.payload.method) {
        return await next()
    }

    if (getAuthState() !== AuthState.Connected) {
        throw new UnauthorizedProviderError(new Error("Not allowed"))
    }

    return hasPermission({ eth_accounts: {} }) ? getUser()?.addresses : []
}
