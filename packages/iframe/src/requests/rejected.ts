import { EIP1193ErrorCodes, Msgs, type PopupMsgs, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { happyProviderBus } from "../services/eventBus"
import { confirmWindowId } from "./utils"

/**
 * Processes requests rejected by the user in the pop-up, forwarding the rejection to the app.
 */
export async function handleRejectedRequest(data: PopupMsgs[Msgs.PopupReject]): Promise<void> {
    if (!confirmWindowId(data.windowId)) return

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
