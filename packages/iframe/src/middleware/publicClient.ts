import type {
    EIP1193RequestParameters,
    EIP1193RequestPublicClientMethods,
    ProviderEventPayload,
} from "@happychain/sdk-shared"
import { useCallback } from "react"
import { type PublicClient, UnauthorizedProviderError } from "viem"
import { usePermissionsCheck } from "../hooks/usePermissionsCheck"
import { useEthAccountsMiddleware } from "./publicClient/eth_accounts"
import { useEthChainIdMiddleware } from "./publicClient/eth_chainId"
import { useEthRequestAccountsMiddleware } from "./publicClient/eth_requestAccounts"
import { useWalletGetPermissionsMiddleware } from "./publicClient/wallet_getPermissions"
import { useWalletRevokePermissionsMiddleware } from "./publicClient/wallet_revokePermissions"
import { useClientMiddlewareExecutor } from "./utils"

export function usePublicClientMiddleware() {
    const { checkIfRequestRequiresConfirmation: requiresConfirmation } = usePermissionsCheck()

    // middlewares
    const ethChainId = useEthChainIdMiddleware()
    const ethAccounts = useEthAccountsMiddleware()
    const ethRequestAccounts = useEthRequestAccountsMiddleware()
    const walletGetPermissions = useWalletGetPermissionsMiddleware()
    const walletRevokePermissions = useWalletRevokePermissionsMiddleware()

    const execute = useCallback(
        async (
            client: PublicClient,
            data: ProviderEventPayload<EIP1193RequestParameters<EIP1193RequestPublicClientMethods>>,
        ) => {
            if (requiresConfirmation(data.payload)) {
                throw new UnauthorizedProviderError(new Error("Not allowed"))
            }
            return await client.request(data.payload)
        },
        [requiresConfirmation],
    )

    return useClientMiddlewareExecutor(execute, [
        // rpc optimizations
        ethChainId,
        // permissions system
        ethAccounts,
        ethRequestAccounts,
        walletGetPermissions,
        walletRevokePermissions,
    ]) as ReturnType<typeof useClientMiddlewareExecutor> // ?? needed to help inferred types be resolved...
}
