import { EIP1193ErrorCodes, Msgs, type PopupMsgs, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { confirmWindowId } from "./utils"

/**
 * Processes requests rejected by the user in the pop-up, forwarding the rejection to the app.
 */
export async function handleRejectedRequest(request: PopupMsgs[Msgs.PopupReject]): Promise<void> {
    if (!confirmWindowId(request.windowId)) return

    if (request.error) {
        void happyProviderBus.emit(Msgs.RequestResponse, request)
    } else {
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: request.key,
            windowId: request.windowId,
            error: getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest),
            payload: null,
        })
    }
}
