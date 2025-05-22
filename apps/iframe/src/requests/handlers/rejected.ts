import {
    EIP1193UserRejectedRequestError,
    Msgs,
    type PopupMsgs,
    WalletType,
    serializeRpcError,
} from "@happy.tech/wallet-common"
import { InjectedProviderProxy } from "#src/connections/InjectedProviderProxy"
import { happyProviderBus } from "#src/services/eventBus"
import { getUser } from "#src/state/user"
import { appForSourceID, isWallet } from "#src/utils/appURL"
import { iframeProvider } from "#src/wagmi/provider"

/**
 * Handles requests rejected by the user in the pop-up, forwarding the rejection to the app, whether connected to
 * a social or injected wallet.
 */
export async function handleRejectedRequest(data: PopupMsgs[Msgs.PopupReject]): Promise<void> {
    const error = data.error || serializeRpcError(new EIP1193UserRejectedRequestError())

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

    const _isWallet = isWallet(app)
    const _isInjected = getUser()?.type === WalletType.Injected

    if (_isWallet && _isInjected) {
        InjectedProviderProxy.getInstance().handleRequestResolution(response)
    } else if (_isWallet) {
        iframeProvider.handleRequestResolution(response)
    } else {
        void happyProviderBus.emit(Msgs.RequestResponse, response)
    }
}
