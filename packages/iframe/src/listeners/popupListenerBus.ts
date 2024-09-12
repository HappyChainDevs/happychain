import { Msgs } from "@happychain/sdk-shared"
import { WalletClientApproveHandler, WalletClientRejectHandler } from "../middleware/walletClient"
import { popupListenBus } from "../services/eventBus"

/**
 * PopUp RPC requests sent from request popup. Approved requests
 * will be processed and pass through the walletClient middleware stack
 * before being executed. Rejected requests will simple be forwarded to
 * the requesting app to be handled by the developer.
 */
popupListenBus.on(Msgs.PopupApprove, WalletClientApproveHandler)
popupListenBus.on(Msgs.PopupReject, WalletClientRejectHandler)
