import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { UnauthorizedProviderError } from "viem"
import { getPermissions, hasPermission } from "../../../services/permissions"
import { getAuthState } from "../../../state/authState"

/**
 * {@link  https://eips.ethereum.org/EIPS/eip-2255}
 */
export async function walletRequestPermissionsMiddleware(
    request: ProviderEventPayload<EIP1193RequestParameters>,
    next: () => Promise<EIP1193RequestResult>,
): Promise<EIP1193RequestResult> {
    if ("wallet_requestPermissions" !== request.payload.method) {
        return await next()
    }

    if (getAuthState() !== AuthState.Connected) {
        throw new UnauthorizedProviderError(new Error("Not allowed"))
    }

    return hasPermission(...request.payload.params) ? getPermissions(request.payload) : []
}