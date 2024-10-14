import { Msgs } from "@happychain/sdk-shared"
import { handleApprovedRequest, handleRejectedRequest } from "../requests"
import { popupListenBus } from "../services/eventBus"

/**
 * PopUp RPC requests sent from request popup. Approved requests
 * will be processed and pass through the walletClient middleware stack
 * before being executed. Rejected requests will simple be forwarded to
 * the requesting app to be handled by the developer.
 */
popupListenBus.on(Msgs.PopupApprove, handleApprovedRequest)
popupListenBus.on(Msgs.PopupReject, handleRejectedRequest)
