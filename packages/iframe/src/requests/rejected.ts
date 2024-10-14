import { EIP1193ErrorCodes, Msgs, type PopupMsgs, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { iframeProvider } from "../wagmi/provider"
import { isAllowedSourceId, isIframeId } from "./utils"

/**
 * Processes requests rejected by the user in the pop-up, forwarding the rejection to the app.
 */
export async function handleRejectedRequest(data: PopupMsgs[Msgs.PopupReject]): Promise<void> {
    const error = data.error || getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest)

    if (!isAllowedSourceId(data.windowId)) return

    const response = {
        key: data.key,
        windowId: data.windowId,
        error: error,
        payload: null,
    }

    if (isIframeId(data.windowId)) {
        iframeProvider.handleRequestResolution(response)
    } else {
        void happyProviderBus.emit(Msgs.RequestResponse, response)
    }
}
