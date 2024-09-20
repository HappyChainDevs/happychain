import type { PopupMsgs } from "@happychain/sdk-shared"
import { Msgs, getEIP1193ErrorObjectFromUnknown } from "@happychain/sdk-shared"
import { EIP1193ErrorCodes, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { type Client, ProviderDisconnectedError } from "viem"
import { happyProviderBus } from "../services/eventBus"
import { getWalletClient } from "../state/walletClient"
import { confirmWindowId } from "../utils/confirmWindowId"
import { runMiddlewares } from "./runMiddlewares"
import type { MiddlewareFunction } from "./types"
import { ethRequestAccountsMiddleware } from "./walletClient/eth_requestAccounts/eth_requestAccounts"
import { walletAddEthereumChainMiddleware } from "./walletClient/wallet_addEthereumChain"
import { walletRequestPermissionsMiddleware } from "./walletClient/wallet_requestPermissions/wallet_requestPermissions"
import { walletSwitchEthereumChainMiddleware } from "./walletClient/wallet_switchEthereumChain"
import { walletWatchAssetMiddleware } from "./walletClient/wallet_watchAsset/wallet_watchAsset"

type ApproveCallback = (data: PopupMsgs[Msgs.PopupApprove]) => Promise<void>
type RejectCallback = (data: PopupMsgs[Msgs.PopupReject]) => Promise<void>

/**
 * Processes requests approved by the user in the pop-up,
 * running them through a series of middleware.
 */
export const WalletClientApproveHandler: ApproveCallback = async (data) => {
    // wrong window, ignore
    if (!confirmWindowId(data.windowId)) return

    try {
        const client: Client | undefined = getWalletClient()

        const middlewares = [
            ethRequestAccountsMiddleware,
            walletRequestPermissionsMiddleware,
            walletAddEthereumChainMiddleware,
            walletSwitchEthereumChainMiddleware,
            walletWatchAssetMiddleware,
            <MiddlewareFunction>(async (data) => {
                if (!client) throw new ProviderDisconnectedError(new Error("Wallet client not found"))
                return await client.request(data.payload)
            }),
        ]

        const payload = await runMiddlewares(data, middlewares)

        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: data.key,
            windowId: data.windowId,
            error: null,
            payload: payload || {},
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

/**
 * Processes requests rejected by the user in the pop-up, forwarding the rejection to the app.
 */
export const WalletClientRejectHandler: RejectCallback = async (data) => {
    if (!confirmWindowId(data.windowId)) return
    void happyProviderBus.emit(Msgs.RequestResponse, data)

    if (data.error) {
        void happyProviderBus.emit(Msgs.RequestResponse, data)
    } else {
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: data.key,
            windowId: data.windowId,
            error: getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest),
            payload: null,
        })
    }
}
