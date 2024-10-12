import { EIP1193ErrorCodes, Msgs, type PopupMsgs, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { iframeProvider } from "../wagmi/provider"
import { iframeID, parentID } from "./utils"

/**
 * Processes requests rejected by the user in the pop-up, forwarding the rejection to the app.
 */
export async function handleRejectedRequest(data: PopupMsgs[Msgs.PopupReject]): Promise<void> {
    const error = data.error || getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest)

    const response = {
        key: data.key,
        windowId: data.windowId,
        error: error,
        payload: null,
    }

    if (data.windowId === iframeID) {
        void iframeProvider.handleRequestResolution(response)
    } else if (data.windowId === parentID) {
        void happyProviderBus.emit(Msgs.RequestResponse, response)
    } else {
        console.warn("Unsupported request source", data.windowId)
    }
}
