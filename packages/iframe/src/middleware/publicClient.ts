import { Msgs, type ProviderMsgsFromApp, getEIP1193ErrorObjectFromUnknown } from "@happychain/sdk-shared"
import { type Client, UnauthorizedProviderError } from "viem"
import { happyProviderBus } from "../services/eventBus"
import { getPublicClient } from "../state/publicClient"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"
import { confirmWindowId } from "../utils/confirmWindowId"
import { ethAccountsMiddleware } from "./publicClient/eth_accounts"
import { ethChainIdMiddleware } from "./publicClient/eth_chainId"
import { ethRequestAccountsMiddleware } from "./publicClient/eth_requestAccounts/eth_requestAccounts"
import { walletGetPermissionsMiddleware } from "./publicClient/wallet_getPermissions"
import { walletRequestPermissionsMiddleware } from "./publicClient/wallet_requestPermissions/wallet_requestPermissions"
import { walletRevokePermissionsMiddleware } from "./publicClient/wallet_revokePermissions"
import { runMiddlewares } from "./runMiddlewares"
import type { MiddlewareFunction } from "./types"

export const PublicClientApproveHandler: (data: ProviderMsgsFromApp[Msgs.RequestPermissionless]) => Promise<void> =
    async (data) => {
        if (!confirmWindowId(data.windowId)) return

        try {
            const client: Client = getPublicClient()

            const middlewares = [
                ethChainIdMiddleware,
                ethAccountsMiddleware,
                ethRequestAccountsMiddleware,
                walletGetPermissionsMiddleware,
                walletRequestPermissionsMiddleware,
                walletRevokePermissionsMiddleware,
                <MiddlewareFunction>(async (data) => {
                    if (checkIfRequestRequiresConfirmation(data.payload))
                        throw new UnauthorizedProviderError(new Error("Not allowed"))
                    return await client.request(data.payload)
                }),
            ]

            const payload = await runMiddlewares(data, middlewares)

            void happyProviderBus.emit(Msgs.RequestResponse, {
                key: data.key,
                windowId: data.windowId,
                error: null,
                payload: payload,
            })
        } catch (e) {
            void happyProviderBus.emit(Msgs.RequestResponse, {
                key: data.key,
                windowId: data.windowId,
                error: getEIP1193ErrorObjectFromUnknown(e),
                payload: null,
            })
        }
    }
