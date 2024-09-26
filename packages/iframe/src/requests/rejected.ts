import { EIP1193ErrorCodes, Msgs, type PopupMsgs, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { iframeProvider } from "../wagmi/provider"
import { confirmIframeId, confirmWindowId } from "./utils"

/**
 * Processes requests rejected by the user in the pop-up, forwarding the rejection to the app.
 */
export async function handleRejectedRequest(data: PopupMsgs[Msgs.PopupReject]): Promise<void> {
    const error = data.error || getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest)

    if (confirmWindowId(data.windowId)) {
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: data.key,
            windowId: data.windowId,
            error: error,
            payload: null,
        })
    } else if (confirmIframeId(data.windowId)) {
        iframeProvider.handleRequestResolution({
            key: data.key,
            windowId: data.windowId,
            error: error,
            payload: null,
        })
    }
}
