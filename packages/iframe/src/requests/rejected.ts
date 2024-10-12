import { EIP1193ErrorCodes, Msgs, type PopupMsgs, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { iframeProvider } from "../wagmi/provider"
import { confirmIframeId, confirmSourceId } from "./utils"

/**
 * Processes requests rejected by the user in the pop-up, forwarding the rejection to the app.
 */
export async function handleRejectedRequest(request: PopupMsgs[Msgs.PopupReject]): Promise<void> {
    if (!confirmSourceId(request.windowId)) {
        console.warn("Unsupported Request Source", request.windowId)
        return
    }

    const error = request.error || getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest)

    if (!confirmSourceId(request.windowId)) return

    const response = {
        key: request.key,
        windowId: request.windowId,
        error: error,
        payload: null,
    }

    if (confirmIframeId(request.windowId)) {
        void iframeProvider.handleRequestResolution(response)
    } else {
        void happyProviderBus.emit(Msgs.RequestResponse, response)
    }
}
