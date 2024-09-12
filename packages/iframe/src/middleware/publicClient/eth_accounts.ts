import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { hasPermission } from "../../services/permissions"
import { getUser } from "../../state/user"

export async function ethAccountsMiddleware(
    request: ProviderEventPayload<EIP1193RequestParameters>,
    next: () => Promise<EIP1193RequestResult>,
): Promise<EIP1193RequestResult> {
    if ("eth_accounts" !== request.payload.method) {
        return await next()
    }

    return hasPermission({ eth_accounts: {} }) ? getUser()?.addresses : []
}
