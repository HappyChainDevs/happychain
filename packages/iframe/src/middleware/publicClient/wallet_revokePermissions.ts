import { AuthState } from "@happychain/sdk-shared"
import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { UnauthorizedProviderError } from "viem"
import { revokePermissions } from "../../services/permissions"
import { getAuthState } from "../../state/authState"

/**
 * {@link https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md}
 */
export async function walletRevokePermissionsMiddleware(
    request: ProviderEventPayload<EIP1193RequestParameters>,
    next: () => Promise<EIP1193RequestResult>,
): Promise<EIP1193RequestResult> {
    if ("wallet_revokePermissions" !== request.payload.method) {
        return await next()
    }

    if (getAuthState() !== AuthState.Connected) {
        throw new UnauthorizedProviderError(new Error("Not allowed"))
    }

    revokePermissions(request.payload.params[0])

    return []
}
