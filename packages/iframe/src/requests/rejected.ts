import {
    EIP1193ErrorCodes,
    Msgs,
    type PopupMsgs,
    WalletType,
    getEIP1193ErrorObjectFromCode,
} from "@happychain/sdk-shared"
import { InjectedProviderProxy } from "#src/connections/InjectedProviderProxy.ts"
import { getUser } from "#src/state/user.ts"
import { happyProviderBus } from "../services/eventBus"
import { isIframe } from "../utils/appURL"
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

    if (!app) {
        console.warn("Unsupported source app, abandoning rejected request", app, data)
        return
    }

    const _isIframe = isIframe(app)
    const _isInjected = getUser()?.type === WalletType.Injected

    if (_isIframe && _isInjected) {
        InjectedProviderProxy.getInstance().handleRequestResolution(response)
    } else if (_isIframe) {
        iframeProvider.handleRequestResolution(response)
    } else {
        void happyProviderBus.emit(Msgs.RequestResponse, response)
    }
}
