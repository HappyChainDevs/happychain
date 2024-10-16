import { EIP1193ErrorCodes, Msgs, type PopupMsgs, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { getAppURL, getIframeURL } from "../utils/appURL"
import { iframeProvider } from "../wagmi/provider"
import { appForSourceID } from "./utils"

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

    const app = appForSourceID(data.windowId)

    if (app === getIframeURL()) {
        void iframeProvider.handleRequestResolution(response)
    } else if (app === getAppURL()) {
        void happyProviderBus.emit(Msgs.RequestResponse, response)
    } else {
        console.warn("Unsupported source app, abandoning rejected request", app, data)
    }
}
