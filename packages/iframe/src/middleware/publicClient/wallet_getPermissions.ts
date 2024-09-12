import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { getPermissions } from "../../services/permissions/getPermissions"

/**
 * {@link  https://eips.ethereum.org/EIPS/eip-2255}
 */
export async function walletGetPermissionsMiddleware(
    request: ProviderEventPayload<EIP1193RequestParameters>,
    next: () => Promise<EIP1193RequestResult>,
): Promise<EIP1193RequestResult> {
    if ("wallet_getPermissions" !== request.payload.method) {
        return await next()
    }

    return getPermissions(request.payload)
}
